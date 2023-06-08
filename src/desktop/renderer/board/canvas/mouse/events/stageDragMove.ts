import renderVisible from "../../image/renderVisible";
import { whenDraw } from "../../../../lib/twiks";
import { KonvaEventObject } from "konva/lib/Node";


export default function (e: KonvaEventObject<DragEvent>){
    whenDraw(e, (_, __, canvas) => {
        renderVisible(canvas)
    })
}