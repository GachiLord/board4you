import store from "../../../store/store"
import CanvasUtils from "../../../lib/CanvasUtils"
import Konva from "konva"


export default function(layer, temporaryLayer){
    const stageState = store.getState().stage
    const stagePos = stageState.stagePos
    const baseHeight = stageState.baseHeight
    const width = stageState.width
    const lastY = CanvasUtils.findLastY(layer)


    let urls = []
    for (let y = stagePos.y; y <= lastY + stagePos.y; y += baseHeight){
        // add background because of png output
        const background = new Konva.Rect({
            x: stagePos.x,
            y: y,
            width: width,
            height: baseHeight,
            fill: 'white'
        })
        temporaryLayer.add(background)

        // add image
        urls.push(
            layer.toDataURL({
                x: stagePos.x,
                y: y,
                width: width,
                height: baseHeight,
            })
        )
    }
    
    // clear background
    temporaryLayer.destroyChildren()
    
    return urls
}