import Konva from "konva";

export default class historyUtils{
    static buildFromActions(actions){
  
        return actions.map(action => {
            switch(action.type){
                case 'add':
                    break
                case 'remove':
                    break
                case 'move':
                    break
            }
        });
    }

    static toKonvaObject(shape){
        switch(shape.type){
            case 'arrow':
                return (
                    new Konva.Arrow({
                        y:shape.pos.y,
                        x:shape.pos.x,
                        shapeId:shape.shapeId,
                        points:shape.points,
                        stroke:shape.color,
                        fill:shape.color,
                        strokeWidth:shape.lineSize,
                        tension:0.5,
                        lineCap:"round",
                        lineJoin:"round",
                        hitStrokeWidth: shape.lineSize * 15,
                        shadowForStrokeEnabled:false,
                        globalCompositeOperation:'source-over',
                        tool:shape.tool,
                        dash:shape.lineType === 'general' ? []: [10, 10],
                        listening: true,
                        connected: new Set()
                    })
                )
        
            case 'img':
                const img = new Image(shape.url)
                return (
                    new Konva.Image({
                        shapeId:shape.shapeId,
                        image:img,
                        x:shape.pos.x,
                        y:shape.pos.y,
                        width:shape.width,
                        height:shape.height,
                        tool:shape.tool,
                        globalCompositeOperation:'destination-over',
                        applyCache: true,
                        applyHitFromCache: true,
                        listening: true,
                        connected: new Set()
                    })
                )
            case 'rect':
                return (
                    new Konva.Rect({
                        x:shape.pos.x,
                        y:shape.pos.y,
                        width:shape.width,
                        height:shape.height,
                        stroke:shape.color,
                        strokeWidth:shape.lineSize,
                        shadowForStrokeEnabled:false,
                        shapeId:shape.shapeId,
                        hitStrokeWidth:30,
                        globalCompositeOperation:'source-over',
                        tool:shape.tool,
                        dash:shape.lineType === 'general' ? []: [10, 10],
                        listening: true,
                        connected: new Set()
                    })
                )
            case 'line':
                return (
                    new Konva.Line({
                        y:shape.pos.y,
                        x:shape.pos.x,
                        shapeId:shape.shapeId,
                        points:shape.points,
                        stroke:shape.color,
                        strokeWidth:shape.lineSize,
                        dash:shape.lineType === 'general' ? []: [10, 10],
                        tension:0.5,
                        lineCap:"round",
                        lineJoin:"round",
                        hitStrokeWidth: shape.lineSize * 15,
                        shadowForStrokeEnabled:false,
                        globalCompositeOperation: shape.tool === 'eraser' ? 'destination-out' : 'source-over',
                        tool:shape.tool,
                        listening: shape.tool !== 'eraser', // dont listen for eraser lines
                        connected: new Set()
                    })
                )
            case 'ellipse':
                return (
                    new Konva.Ellipse({
                        x:shape.pos.x,
                        y:shape.pos.y,
                        radiusX:Math.abs(shape.width),
                        radiusY:Math.abs(shape.height),
                        stroke:shape.color,
                        hitStrokeWidth: 30,
                        strokeWidth:shape.lineSize,
                        shadowForStrokeEnabled:false,
                        shapeId:shape.shapeId,
                        globalCompositeOperation:'source-over',
                        tool:shape.tool,
                        dash:shape.lineType === 'general' ? []: [10, 10],
                        listening: true,
                        connected: new Set()
                    })
                )                
        }
    }

    static getPropsFromActions(actions, prop='shapeId'){
        const propList = []
        actions.forEach( a => {
            if (a[prop]) propList.push(a[prop])
        } )
        return propList
    }


}