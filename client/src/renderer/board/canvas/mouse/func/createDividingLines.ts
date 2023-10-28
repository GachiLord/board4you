import Konva from "konva";


export default function(linesLayer: Konva.Layer, size: { width: number, height: number, baseHeight: number }){
    const width = size.width
    const maxHeight = size.height
    const baseHeight = size.baseHeight
    
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