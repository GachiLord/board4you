import jsPDF from "jspdf"
import store from "../store/store"


export default class ImageUtils{

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

    static base64ToBlob = async (base64) => {
        return await fetch(base64)
    }

    static async base64ToImage(base64){
        return new Promise( resolve => {
            const image = new Image()
            image.onload = function(){
                resolve(image)
            }
            image.src = base64
        } )
    } 

    static pdfToBase64imgs = async (path) => {
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

    static async base64imgsToPdfObject(imgs){
        const stage = store.getState().stage
        const size = [stage.width, stage.baseHeight]
        const doc = new jsPDF({
            orientation: 'l',
            format: size
        })
        imgs = await imgs

        imgs.forEach( (item, index) => {
            doc.addImage(item, 'PNG', 0, 0, stage.width, stage.baseHeight)
            if (index < imgs.length - 1) doc.addPage(size, 'l')
        } )
        return doc
    }

    static async urlToImage(url){
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