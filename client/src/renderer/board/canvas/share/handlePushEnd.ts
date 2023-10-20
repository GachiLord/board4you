import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import { addCurrent } from "../../../features/history";
import store from "../../../store/store";
import { itemIn } from "../../../lib/twiks";
import { setHeight } from "../../../features/stage";
import boardEvents from "../../../base/constants/boardEvents";

export default function handlePushEnd(canvas: Konva.Layer, shapeId: string){
    const shape = CanvasUtils.findLastOne(canvas, { shapeId: shapeId })
    if ( !(shape instanceof Konva.Shape) ) throw new TypeError('shape must be Konva.Shape')
    // save edit
    store.dispatch(addCurrent(
        {id: shape.attrs.shapeId, type: 'add', shape: CanvasUtils.toShape(shape)}
    ))
    if (itemIn(shape.attrs.tool, 'pen', 'eraser', 'arrow', 'line')) {
        // add points if shape created by one click
        if ( !(shape instanceof Konva.Line) ) throw new TypeError('shape must be Konva.Line')
        const points = shape.attrs.points
        if (points.length === 2){
            shape.points([ points[0] + 1, points[1] + 1, points[0] - 1, points[1] ])
        }
        // cache shape
        shape.cache()
    }
    // update height using last shape
    const stage = store.getState().stage
    const newHeight = CanvasUtils.getHeight(canvas, stage.baseHeight)
    if (stage.height < newHeight){
        store.dispatch(setHeight(newHeight))
        boardEvents.emit('sizeHasChanged')
    }
}