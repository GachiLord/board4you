import CanvasUtils from "../../../../lib/CanvasUtils";
import { whenDraw } from "../../../../lib/twiks";
import { setDrawable } from "../../../features/stage";
import { addCurrent } from "../../../features/history";
import store from "../../../store/store";
import Konva from "konva";


export default function(e, props){
    const isDrawing = store.getState().stage.isDrawable
    const tool = props.tool

    whenDraw( e, (_, __, canvas, temporary) => {
        if ('pen'=== tool && isDrawing){
            let lastLine = canvas.children.at(-1)
            let points = lastLine.attrs.points
            
            if (points.length === 2){
                lastLine.points([ points[0] + 1, points[1] + 1, points[0] - 1, points[1] ])
            }
            // cache the line to improve perfomance
            lastLine.cache()
            // add line to history
            store.dispatch(addCurrent({type: 'add', shape: CanvasUtils.toShape(lastLine)}))
        }
        else if (tool === 'select' && isDrawing && temporary.children[0]){
            let shapes = canvas.children
            let box = temporary.children[0]
            const clientRect = box.getClientRect()
    
            // offset negative wifth and height
            if (clientRect.width < 0) {
                clientRect.x += box.width
                clientRect.width = Math.abs(clientRect.width)
            }
            if (clientRect.height < 0){
                clientRect.y += clientRect.height
                clientRect.height = Math.abs(clientRect.height)
            }
            
            let selected = []
            let resizable = null
            // find shapes which have interception with clientRect
            shapes.forEach( shape => {
                if (Konva.Util.haveIntersection(clientRect, shape.getClientRect())){
                    resizable = shape.attrs.connected.size === 0 && resizable !== false

                    selected.push(shape)
                    shapes.forEach(i => {
                        if (shape.attrs.connected.has(i.attrs.shapeId)) selected.push(i)
                    })
                }
            } )
            selected.forEach( s => {
                s.setAttr('draggable', true)
            } )
            // create transformer for them
            const tr = new Konva.Transformer({
                resizeEnabled: resizable
            });
            canvas.add(tr);
            tr.nodes(selected)
            box.destroy()
        }
    } )


    store.dispatch(setDrawable(false))
}