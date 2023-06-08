import store from "../../../../store/store"
import { setStagePos } from "../../../../features/stage"
import { KonvaEventObject } from "konva/lib/Node"


export default function(e: KonvaEventObject<DragEvent>){
    const target = e.target

    store.dispatch(setStagePos(
        {
            x: target.attrs.x,
            y: target.attrs.y
        }
    ))
}