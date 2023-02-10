import { Util } from 'konva/lib/Util'

export default class CanvasUtils{
    
    static getViewedHisotry(history, viewBox) {
        return history.filter( s => 
            (Util.haveIntersection(viewBox, this.getClientRect(s)) || s.type === 'img')
        )
    }

    static getClientRect(shape){
        const attrs = shape.attrs === undefined ? shape: shape.attrs

        if (Object.keys(attrs).includes('height')) {
            return {
                x: attrs.x,
                y: attrs.y,
                height: attrs.height,
                width: attrs.width
            }
        }
        else if (Object.keys(attrs).includes('radiusX')) return{
            x: attrs.x,
            y: attrs.y,
            height: attrs.radiusX,
            width: attrs.radiusY
        }

        let x = attrs.pos.x
        let y = attrs.pos.y
        let minX = Math.min(...this.getCoorFromPoints(attrs.points, 'x'))
        let maxX = Math.max(...this.getCoorFromPoints(attrs.points, 'x'))
        let minY = Math.min(...this.getCoorFromPoints(attrs.points, 'y'))
        let maxY = Math.max(...this.getCoorFromPoints(attrs.points, 'y'))

        return {
            x: x + minX,
            y: y + minY,
            height: maxY - minY,
            width: maxX - minX
        }
    }

    static findShapes = (history, query = {}) => {
        return history.map( (hisItem) => {
            // get count of mathced properties
            let matchCount = Object.keys(query).reduce( (acc, value) => {
                if (query[value] === hisItem[value]) return acc + 1
            }, 0 )

            // if item matched, change values
            if ( matchCount === Object.keys(query).length ) {
                return hisItem
            }
        }).filter( i => i !== undefined )
    }

    static getHistoryWithChanges = (history, query = {}, attrsKeyValue = {}) => {
        
        history = history.slice()

        history.forEach( (hisItem, index) => {
            // get count of mathced properties
            let matchCount = Object.keys(query).reduce( (acc, value) => {
                if (query[value] === hisItem[value]) return acc + 1
            }, 0 )

            // if item matched, change values
            if ( matchCount === Object.keys(query).length ) {
                let newHisItem = {...hisItem}
                Object.keys(attrsKeyValue).forEach( propToChange => {
                    newHisItem[propToChange] = attrsKeyValue[propToChange]
                } )

                history[index] = newHisItem
            }
        } )


        return history
    }

    static getCoorFromPoints = (points, coor) => {
        return points.map(
            (item, index) => {
                if ((index+1) % 2 === 0){
                    if (coor === 'y') return item
                }
                else{
                    if (coor === 'x') return item
                }
            }
        ).filter(i => {if (i !== undefined) return i})
    }

    static getFreeY = (history) => {
        return CanvasUtils.getLastY(history) + 20
    }

    static getLastY = (history) => {
        let y = 0

        history.forEach( s => {
            if (Object.keys(s).includes('height')){
                if (s.pos.y + s.height > y) y = s.pos.y + s.height
            }
            else{
                let yList = CanvasUtils.getCoorFromPoints(s.points, 'y')
                let maxShapeY = Math.max(...yList) - s.pos.y
                if (maxShapeY > y) y = maxShapeY
            }
        } ) 

        return y
    }
 
    static getSizeOfBase64Img = (uri) => {
        return new Promise( (resolve, _) => {
            let element = new Image()
            element.onload = function(){
                let size = {height: this.height, width: this.width}
                element.remove()
                resolve(size)
            } 
            element.src = uri
        } )
    }

    static retrieveImageFromClipboardAsBase64(pasteEvent, callback, imageFormat = "image/png"){
        if(pasteEvent.clipboardData == false){
            if(typeof(callback) == "function"){
                callback(undefined);
            }
        };

        var items = pasteEvent.clipboardData.items;

        if(items == undefined){
            if(typeof(callback) == "function"){
                callback(undefined);
            }
        };

        for (var i = 0; i < items.length; i++) {
            // Skip content if not image
            if (items[i].type.indexOf("image") == -1) continue;
            // Retrieve image on clipboard as blob
            var blob = items[i].getAsFile();

            // Create an abstract canvas and get context
            var mycanvas = document.createElement("canvas");
            var ctx = mycanvas.getContext('2d');
            
            // Create an image
            var img = new Image();

            // Once the image loads, render the img on the canvas
            img.onload = function(){
                // Update dimensions of the canvas with the dimensions of the image
                mycanvas.width = this.width;
                mycanvas.height = this.height;

                // Draw the image
                ctx.drawImage(img, 0, 0);

                // Execute callback with the base64 URI of the image
                if(typeof(callback) == "function"){
                    callback(mycanvas.toDataURL(
                        (imageFormat || "image/png")
                    ),{height: mycanvas.height, width: mycanvas.width});
                }
            };

            // Crossbrowser support for URL
            var URLObj = window.URL || window.webkitURL;

            // Creates a DOMString containing a URL representing the object given in the parameter
            // namely the original Blob
            img.src = URLObj.createObjectURL(blob);
            img.remove()
        }
    }

    static getBlobFromBase64 = async (base64) => {
        return await fetch(base64)
    }

    static getPdfAsBase64imgs = async (path) => {

        let doc = await pdfjsLib.getDocument({url:path}).promise
        let imgs = []
        
        for (let i = 1; i <= doc.numPages; i++){
            let p = await doc.getPage(i)

            let canvas = document.createElement('canvas')
            let context = canvas.getContext('2d')
            let viewport = p.getViewport({scale:1})

            canvas.width = viewport.width
            canvas.height = viewport.height

            let renderTask = await p.render({
                canvasContext: context,
                viewport: viewport
            }).promise

            imgs.push(canvas.toDataURL())
            canvas.remove()
        }


        return imgs
    }

}