import store from "../../../../store/store";


export default function(linesLayer){
    const stage = store.getState().stage
    const width = stage.width
    const maxHeight = stage.height
    const baseHeight = stage.baseHeight

    linesLayer.destroyChildren()

    for (let height = baseHeight; height < maxHeight; height += baseHeight){
        linesLayer.add(new Konva.Line({
            points: [0, height, width, height],
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