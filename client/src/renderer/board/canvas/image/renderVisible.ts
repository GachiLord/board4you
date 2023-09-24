import Konva from "konva";

export default function(layer: Konva.Layer){
    const stage = layer.getParent()
    const stagePos = stage.position(); stagePos.y = Math.abs(stagePos.y)
    const box = { height: stage.attrs.height, width: stage.attrs.width, ...stagePos }

    layer.children.forEach(shape => {
        const clientRect = shape.getClientRect(); clientRect.y = clientRect.y + stagePos.y

        const haveIntersection = Konva.Util.haveIntersection(clientRect, box)
        if (!haveIntersection) shape.hide()
        if (!shape.isVisible() && haveIntersection) shape.show()
    })
}