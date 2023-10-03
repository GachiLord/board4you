import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import { ShareData } from "./ShareData";

export default function handlePushUpdate(canvas: Konva.Layer, attrs: ShareData){
    const shape: any = CanvasUtils.findLastOne(canvas, { shapeId: attrs.shapeId })

    if (attrs.points){
        // set points
        if (shape.attrs.points.length > 2) shape.points(shape.attrs.points.slice(0,2))
        // add points
        shape.points(shape.attrs.points.concat(attrs.points))
    }
    if (attrs.addPoints) shape.points(shape.attrs.points.concat(attrs.addPoints))
    if (attrs.connected) shape.attrs.connected.add(attrs.connected)
    if (attrs.height && attrs.width) shape.setAttrs({
        height: attrs.height,
        width: attrs.width
    })
    if (attrs.radiusX && attrs.radiusY) shape.setAttrs({
        radiusX: attrs.radiusX,
        radiusY: attrs.radiusY
    })
}