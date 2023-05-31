export default class CanvasUtils{

    static #possibleFields = ['tool', 'type', 'color', 'shapeId', 'lineSize', 'lineType',
                              'pos', 'height', 'width', 'radiusX', 'radiusY', 'rotation',
                              'scaleX', 'scaleY', 'skewX', 'skewY', 'points', 'x', 'y', 'connected'
                             ]

    static toKonvaObject(shape){
        const commonAttrs = {
            y: shape.y,
            x: shape.x,
            shapeId: shape.shapeId,
            shadowForStrokeEnabled: false,
            globalCompositeOperation: 'source-over',
            tool: shape.tool,
            type: shape.type,
            lineSize: shape.lineSize,
            color: shape.color,
            lineType: shape.lineType,
            // transform attrs
            rotation: shape.rotation ? shape.rotation: 0,
            scaleX: shape.scaleX ? shape.scaleX: 1,
            scaleY: shape.scaleY ? shape.scaleY: 1,
            skewX: shape.skewX ? shape.skewX: 0,
            skewY: shape.skewY ? shape.skewY: 0,
            // shapes that are must be connected to this
            connected: shape.connected ? new Set(...shape.connected): new Set(),
        }

        switch(shape.type){
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
                const img = new Image(shape.width, shape.height)
                img.src = shape.url

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
                        radiusX:Math.abs(shape.radiusX),
                        radiusY:Math.abs(shape.radiusY),
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
        const possibleFields = CanvasUtils.#possibleFields
        let shape = {}
        for (const [key, value] of Object.entries(shapeObj.attrs)){
            if (!possibleFields.includes(key)) continue

            if (key !== 'connected') shape[key] = value
            else shape[key] = [...value]
        }

        return shape
    }

    static retrivePossibleFields(attrs){
        const possibleFields = {}

        for (const [key, value] of Object.entries(attrs)){
            if (!CanvasUtils.#possibleFields.includes(key)) continue

            if (key !== 'connected') possibleFields[key] = value
            else possibleFields[key] = [...value]
        }

        return possibleFields
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

    static findLastY(layer){
        let y = 0

        layer.children.forEach( shape => {
            if (shape.getType() === 'Group') return
            const s = shape.attrs

            if (Object.keys(s).includes('height')){
                if (s.y + s.height > y) y = s.y + s.height
            }
            else{
                let yList = CanvasUtils.getCoorFromPoints(s.points, 'y')
                let maxShapeY = Math.max(...yList) + s.y
                if (maxShapeY > y) y = maxShapeY
            }
        } ) 

        return y
    }

    static getCoorFromPoints = (points, coor) => {
        return points.map(
            (item, index) => {
                if ((index+1) % 2 === 0){
                    if (coor === 'y') return item
                }
                else{
                    if (coor === 'x') return item
                }
            }
        ).filter(i => {if (i !== undefined) return i})
    }
}