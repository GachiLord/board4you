import store from "../../../store/store"
import { emptyHistory } from "../../../features/history"


export default function(canvas, temporaryLayer){
    store.dispatch(emptyHistory())
    canvas.destroyChildren()
    temporaryLayer.destroyChildren()
}