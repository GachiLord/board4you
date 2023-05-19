import { whenDraw } from "../../../../lib/twiks";
import { setDrawable } from "../../../features/stage";
import store from "../../../store/store";
import CanvasUtils from '../../../../lib/CanvasUtils';
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
        }
        else if (tool === 'select' && isDrawing && temporary.children[0]){
            let shapes = canvas.children
            let box = temporary.children[0]
    
            // offset negative wifth and height
            if (box.width < 0) {
                box.x += box.width
                box.width = Math.abs(box.width)
            }
            if (box.height < 0){
                box.y += box.height
                box.height = Math.abs(box.height)
            }
            
            let selected = shapes.filter((shape) =>
                {
                    const shapeType = shape.attrs.tool
                    if (shapeType === 'line' || shapeType === 'arrow' || shapeType === 'pen'){
                        if (CanvasUtils.hasInterceptionWithLine(box, shape)) return shape
                    }
                    else{
                        if (Konva.Util.haveIntersection(box, shape.getClientRect())) return shape
                    }
                    // if (Konva.Util.haveIntersection(box, CanvasUtils.getClientRect(shape))) return shape
                }
            );
            console.log(selected)
            selected.forEach( s => {
                s.setAttr('draggable', true)
                s.clearCache()
            } )
            const tr = new Konva.Transformer();
            canvas.add(tr);
            tr.nodes(selected)
            box.destroy()
        }
        //else if (tool === 'move') this.setState({isDraggingStage: false})
    } )


    store.dispatch(setDrawable(false))
}