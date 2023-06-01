import CanvasUtils from "../../../../lib/CanvasUtils"
import clearCanvas from "../image/clearCanvas"
import ImageUtils from "../../../../lib/ImageUtils"
import store from "../../../store/store"
import { setBaseHeight, setWidth } from "../../../features/stage"
import insertImage from "../image/insertImage"
import { run } from "../../../../lib/twiks"
import { setStagePos } from "../../../features/stage"
import setCanvasSize from "../../../../model/setCanvasSize"
import boardEvents from "../../../base/boardEvents"


export default async function(data, canvas, temporaryLayer, editManager){
    const stage = canvas.getParent()
    const files = data.base64
    const type = data.type
    const path = data.path

    if (files.length > 0) {
        let y = 0
        clearCanvas(canvas, temporaryLayer)

        if (type === 'pdf'){
            const pdf = await ImageUtils.pdfToBase64imgs(path)
            const imgs = pdf.imgs

            // set size of pdf
            store.dispatch(setBaseHeight(pdf.size.height))
            store.dispatch(setWidth(pdf.size.width))
            setCanvasSize(pdf.size)
            // add pages
            for (let img of imgs){
                insertImage(img, editManager, { x: 0, y: y })
                y += pdf.size.height
            }
            y -= pdf.size.height
        }
        if (type === 'png'){
            const size = await ImageUtils.getSizeOfBase64Img(files[0])
            // set size of png
            store.dispatch(setBaseHeight(size.height))
            store.dispatch(setWidth(size.width))
            setCanvasSize(size)

            for(let img of files){
                insertImage(img, editManager, { x: 0, y: y })
                y += size.height
            }
        }
        // make the Drawer redraw dividing lines
        boardEvents.emit('sizeHasChanged')

        run( (api) => {
            api.handleFileOpen()
        } )
        // set pos to last page
        store.dispatch(setStagePos({x: 0, y: y}))
        stage.position({x: 0, y: -y})
    }
}