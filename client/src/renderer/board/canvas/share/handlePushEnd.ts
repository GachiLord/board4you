import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import { addCurrent } from "../../../features/history";
import store from "../../../store/store";

export default function handlePushEnd(canvas: Konva.Layer, shapeId: string){
    const shape = CanvasUtils.findLastOne(canvas, { shapeId: shapeId })
    if ( !(shape instanceof Konva.Shape) ) throw new TypeError('shape must be Konva.Shape')
    // save edit
    store.dispatch(addCurrent(
        {type: 'add', shape: CanvasUtils.toShape(shape)}
    ))
    // cache shape
    shape.cache()
}