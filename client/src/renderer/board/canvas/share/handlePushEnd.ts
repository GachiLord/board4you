import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import { addCurrent } from "../../../features/history";
import store from "../../../store/store";
import { itemIn } from "../../../lib/twiks";

export default function handlePushEnd(canvas: Konva.Layer, shapeId: string){
    const shape = CanvasUtils.findLastOne(canvas, { shapeId: shapeId })
    if ( !(shape instanceof Konva.Shape) ) throw new TypeError('shape must be Konva.Shape')
    // save edit
    store.dispatch(addCurrent(
        {type: 'add', shape: CanvasUtils.toShape(shape)}
    ))
    // cache shape if shape is complex
    console.log(shape.attrs)
    if (itemIn(shape.attrs.tool, 'pen', 'eraser', 'arrow', 'line')) shape.cache()
}