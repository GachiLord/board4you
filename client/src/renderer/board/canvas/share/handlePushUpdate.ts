import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import { ShareData } from "./ShareData";

export default function handlePushUpdate(canvas: Konva.Layer, attrs: ShareData){
    const shape: any = CanvasUtils.findLastOne(canvas, { shapeId: attrs.shapeId })

    if (attrs.points) shape.points(shape.attrs.points.concat(attrs.points))
}