import { Util } from "konva/lib/Util";

export default function(layer){
    const stage = layer.getParent()
    const stagePos = stage.position(); stagePos.y = Math.abs(stagePos.y)
    const box = { height: stage.attrs.height, width: stage.attrs.width, ...stagePos }

    layer.children.forEach(shape => {
        const clientRect = shape.getClientRect(); clientRect.y = clientRect.y + stagePos.y

        const haveIntersection = Util.haveIntersection(clientRect, box)
        if (!haveIntersection) shape.hide()
        if (!shape.isVisible() && haveIntersection) shape.show()
    })
}