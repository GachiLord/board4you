import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import IShape from "../../../base/typing/IShape";

export default function handlePushStart(canvas: Konva.Layer, shape: IShape){
    console.log(shape)
    canvas.add(CanvasUtils.toKonvaObject(shape))
}