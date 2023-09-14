import Konva from "konva"
import createDividingLines from "./createDividingLines"
import store from "../../../../store/store"

export default function(linesLayer: Konva.Layer, size: undefined|{ width: number, height: number, baseHeight: number }){
    linesLayer.destroyChildren()
    createDividingLines(linesLayer, size ? size: store.getState().stage)
}