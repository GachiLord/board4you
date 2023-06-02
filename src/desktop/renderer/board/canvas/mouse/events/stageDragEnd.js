import store from "../../../../store/store"
import { setStagePos } from "../../../../features/stage"


export default function(e){
    const target = e.target

    store.dispatch(setStagePos(
        {
            x: target.attrs.x,
            y: target.attrs.y
        }
    ))
}