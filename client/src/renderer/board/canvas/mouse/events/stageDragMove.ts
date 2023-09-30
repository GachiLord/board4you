import renderVisible from "../../image/renderVisible";
import { whenDraw } from "../../../../lib/twiks";
import { KonvaEventObject } from "konva/lib/Node";
import heightChange from "../func/heightChange";
import BoardManager from "../../../../lib/BoardManager";


export default function (e: KonvaEventObject<DragEvent>, boardManager: BoardManager){
    whenDraw(e, boardManager, ({stage, canvas}) => {
        // update dividing lines if neccesary
        heightChange(stage.children[2])
        renderVisible(canvas)
    })
}