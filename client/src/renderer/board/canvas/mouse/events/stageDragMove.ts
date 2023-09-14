import renderVisible from "../../image/renderVisible";
import { whenDraw } from "../../../../lib/twiks";
import { KonvaEventObject } from "konva/lib/Node";
import heightChange from "../func/heightChange";


export default function (e: KonvaEventObject<DragEvent>){
    whenDraw(e, (stage, __, canvas) => {
        // update dividing lines if neccesary
        heightChange(stage.children[2])
        renderVisible(canvas)
    })
}