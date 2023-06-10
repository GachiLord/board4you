import clearCanvas from "../image/clearCanvas"
import ImageUtils from "../../../lib/ImageUtils"
import store from "../../../store/store"
import { setBaseHeight, setHeight, setWidth } from "../../../features/stage"
import insertImage from "../image/insertImage"
import { run } from "../../../lib/twiks"
import { setStagePos } from "../../../features/stage"
import setCanvasSize from "../../../lib/setCanvasSize"
import boardEvents from "../../../base/constants/boardEvents"
import Konva from "konva"
import EditManager from "../../../lib/EditManager"
import ISize from "../../../base/typing/ISize"


export default async function(data: {base64: string[], type: string, path: string}, canvas: Konva.Layer, temporaryLayer: Konva.Layer, editManager: EditManager){
    const files = data.base64
    const type = data.type
    const path = data.path
    let resultSize: ISize = null

    if (files.length > 0) {
        let y = 0
        clearCanvas(canvas, temporaryLayer)

        if (type === 'pdf'){
            const pdf = await ImageUtils.pdfToBase64imgs(path)
            const imgs = pdf.imgs

            // set size of pdf
            resultSize = pdf.size
            // add pages
            for (const img of imgs){
                insertImage({
                    data: {url: img, size: pdf.size}, 
                    editManager: editManager, 
                    pos: { x: 0, y: y }, 
                    maxSize: pdf.size
                })
                y += pdf.size.height
            }
            y -= pdf.size.height
        }
        if (type === 'png'){
            const size = await ImageUtils.getSizeOfBase64Img(files[0])
            // set size of png
            resultSize = size

            for(const img of files){
                insertImage({
                    data: img, 
                    editManager: editManager, 
                    pos: { x: 0, y: y }, 
                    maxSize: size
                })
                y += size.height
            }
        }
        // update size
        store.dispatch(setBaseHeight(resultSize.height))
        store.dispatch(setWidth(resultSize.width))
        setCanvasSize(resultSize)
        // update height
        store.dispatch(setHeight(y + resultSize.height))
        // make the Drawer redraw dividing lines
        boardEvents.emit('sizeHasChanged', {width: resultSize.width, height: y + resultSize.height, baseHeight: resultSize.height})

        run( (api) => {
            api.handleFileOpen()
        } )
        // set pos to last page
        store.dispatch(setStagePos({x: 0, y: -y}))
        boardEvents.emit('pageSetted', {x: 0, y: -y})
    }
}