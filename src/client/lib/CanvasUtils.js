export default class CanvasUtils{

    static toKonvaObject(shape){
        const commonAttrs = {
            y: shape.y,
            x: shape.x,
            shapeId: shape.shapeId,
            shadowForStrokeEnabled: false,
            globalCompositeOperation: 'source-over',
            tool: shape.tool,
            lineSize: shape.lineSize,
            color: shape.color,
            lineType: shape.lineType,
            // transform attrs
            rotation: shape.rotation,
            scaleX: shape.scaleX,
            scaleY: shape.scaleY,
            skewX: shape.skewX,
            skewY: shape.skewY,
            // shapes that are must be connected to this
            connected: shape.connected ? shape.connected: new Set(),
        }

        switch(shape.tool){
            case 'arrow':
                return (
                    new Konva.Arrow({
                        ...commonAttrs,
                        points: shape.points,
                        stroke: shape.color,
                        fill: shape.color,
                        strokeWidth: shape.lineSize,
                        tension: 0.5,
                        lineCap: "round",
                        lineJoin: "round",
                        hitStrokeWidth: shape.lineSize * 15,
                        dash: shape.lineType === 'general' ? []: [10, 10],
                        listening: true,
                    })
                )
        
            case 'img':
                const img = new Image(shape.url)
                return (
                    new Konva.Image({
                        ...commonAttrs,
                        image:img,
                        width:shape.width,
                        height: shape.height,
                        globalCompositeOperation: 'destination-over',
                        applyCache: true,
                        applyHitFromCache: true,
                        listening: true,
                    })
                )
            case 'rect':
                return (
                    new Konva.Rect({
                        ...commonAttrs,
                        width: shape.width,
                        height: shape.height,
                        stroke: shape.color,
                        strokeWidth: shape.lineSize,
                        hitStrokeWidth: 30,
                        globalCompositeOperation: 'source-over',
                        dash: shape.lineType === 'general' ? []: [10, 10],
                        listening: true,
                    })
                )
            case 'line':
                return (
                    new Konva.Line({
                        ...commonAttrs,
                        points:shape.points,
                        stroke:shape.color,
                        strokeWidth:shape.lineSize,
                        dash:shape.lineType === 'general' ? []: [10, 10],
                        tension:0.5,
                        lineCap:"round",
                        lineJoin:"round",
                        hitStrokeWidth: shape.lineSize * 15,
                        globalCompositeOperation: shape.tool === 'eraser' ? 'destination-out' : 'source-over',
                        listening: shape.tool !== 'eraser', // dont listen for eraser lines
                    })
                )
            case 'ellipse':
                return (
                    new Konva.Ellipse({
                        ...commonAttrs,
                        radiusX:Math.abs(shape.width),
                        radiusY:Math.abs(shape.height),
                        stroke:shape.color,
                        hitStrokeWidth: 30,
                        strokeWidth:shape.lineSize,
                        dash:shape.lineType === 'general' ? []: [10, 10],
                        listening: true,
                    })
                )                
        }
    }

    static toShape(shapeObj){
        const possibleFields = ['tool', 'type', 'color', 'shapeId', 'lineSize', 'lineType',
                                'pos', 'height', 'width', 'radiusX', 'radiusY', 'rotation',
                                'scaleX', 'scaleY', 'skewX', 'skewY', 'points'
                               ]
        let shape = {}
        for (const [key, value] of Object.entries(shapeObj.attrs)){
            if (possibleFields.includes(key)) shape[key] = value
        }

        return shape
    }

    static find(layer, attrs){
        return layer.children.filter( c => {
            let coincidence = 0

            for (const [key, value] of Object.entries(c.attrs)){
                if (attrs[key] === value) coincidence++
            }

            if (coincidence === Object.keys(attrs).length) return c
        } )
    }

    static findOne(layer, attrs){
        return CanvasUtils.find(layer, attrs)[0]
    }
}