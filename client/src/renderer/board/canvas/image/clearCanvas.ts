import store from "../../../store/store"
import { emptyHistory } from "../../../features/history"
import Konva from "konva"


export default function(canvas: Konva.Layer, temporaryLayer: Konva.Layer){
    store.dispatch(emptyHistory())
    canvas.destroyChildren()
    temporaryLayer.destroyChildren()
}