class ImageConverter{
    static getSizeOfBase64Img = (uri) => {
        return new Promise( (resolve, _) => {
            let element = new Image()
            element.onload = function(){
                let size = {height: this.height !== NaN ? this.height: 0, width: this.width !== NaN ? this.width: 0}
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
        let pagesWidth = []
        let pagesHeight = []

        for (let i = 1; i <= doc.numPages; i++){
            let p = await doc.getPage(i)
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            const viewport = p.getViewport({ scale: 1 })
            
            canvas.width = viewport.width
            canvas.height = viewport.height

            let renderTask = await p.render({
                canvasContext: context,
                viewport: viewport
            }).promise

            imgs.push(canvas.toDataURL())
            canvas.remove()

            pagesWidth.push(viewport.width)
            pagesHeight.push(viewport.height)
        }

        return {imgs: imgs, size: {width: Math.max(...pagesWidth), height: Math.max(...pagesHeight)} }
    }

    static async getBase64imgsAsPdf(imgs){
        const doc = new jsPDF({
            orientation: 'l',
            format: Object.values(getCanvasSize()),
        })
        imgs = await imgs

        imgs.forEach( (item, index) => {
            doc.addImage(item, 'PNG', 0, 0, getCanvasSize().width, getCanvasSize().height)
            if (index < imgs.length - 1) doc.addPage(Object.values(getCanvasSize()), 'l')
        } )
        return doc
    }

    static async getImageFromUrl(url){
        return new Promise( (res, rej) => {
            let img = new Image()
    
            img.onError = function() {
                rej('Cannot load image')
            };
            img.onload = function() {
                res(img);
            };        
            img.src = url;
        } )
        
    }
}