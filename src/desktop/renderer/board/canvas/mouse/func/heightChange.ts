import store from "../../../../store/store";
import { setHeight } from "../../../../features/stage";
import Konva from "konva";


export default function(linesLayer: Konva.Layer){
    const stage = store.getState().stage
    const stagePos = stage.stagePos
    const currentHeight = stage.height
    const baseHeight = stage.baseHeight

    if ( (Math.abs(stagePos.y)) + baseHeight >= currentHeight - baseHeight){
        const width = stage.width
        // update height
        store.dispatch(setHeight(currentHeight + baseHeight))
        // add dashed line
        linesLayer.add(new Konva.Line({
            points: [0, currentHeight, width, currentHeight],
            stroke: 'black',
            strokeWidth: 2,
            tension: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
            globalCompositeOperation: 'source-over',
            dash: [20, 10],
            opacity: 0.2,
            shadowForStrokeEnabled: false,
            listening: false
        }))
    }
}