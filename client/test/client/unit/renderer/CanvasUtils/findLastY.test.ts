import Konva from "konva";
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";
import LineFactory from "../../../../../src/renderer/lib/NodeFactories/LineFactory";
import { test, describe } from "node:test"
import assert from "node:assert"


describe("findLastY", () => {
    test('lastY should be lower or equal than max height', () => {
        const size = { height: 900, width: 900 }
        const factory = new LineFactory({positionRestrictions: size})
        const layer = new Konva.Layer()
    
        layer.add(...factory.create(50))
        const lastY = CanvasUtils.findLastY(layer)
        
        assert.ok(lastY <= size.height)
    })
    
    test('should work with lines', () => {
        const layer = new Konva.Layer()
        const children = [ 
            new Konva.Line({x:0, y:0, points: [ 241,543,213,214 ]}), // max
            new Konva.Line({x:0, y:0, points: [ 11,11,21,122 ]}),
            new Konva.Line({x:0, y:0, points: [ 11,28,37,454 ]})
        ]
    
        layer.add(...children)
        const lastY = CanvasUtils.findLastY(layer)
    
        assert.equal(lastY, 543)
    })
    
    test('should work with rects', () => {
        const layer = new Konva.Layer()
        const children = [ 
            new Konva.Rect({x:0, y:200, height: 500, width: 200}), // max
            new Konva.Rect({x:0, y:10, height: 200, width: 200}),
            new Konva.Rect({x:0, y:42, height: 24, width: 24})
        ]
    
        layer.add(...children)
        const lastY = CanvasUtils.findLastY(layer)
    
        assert.equal(lastY, 700)
    })
    
    test('should work with ellipses', () => {
        const layer = new Konva.Layer()
        const children = [ 
            new Konva.Ellipse({x:0, y:200, radiusX: 500, radiusY: 200}), // max 
            new Konva.Ellipse({x:0, y:10, radiusX: 200, radiusY: 200}),
            new Konva.Ellipse({x:0, y:42, radiusX: 24, radiusY: 24})
        ]
    
        layer.add(...children)
        const lastY = CanvasUtils.findLastY(layer)

        assert.equal(lastY, 400)
    })
    
    test('shold work with all shapes', () => {
        const layer = new Konva.Layer()
        const children = [ 
            new Konva.Line({x:500, y:300, points: [ 241,800,213,214 ]}), // max
            new Konva.Rect({x:24, y:420, height: 200, width: 200}),
            new Konva.Ellipse({x:50, y:500, radiusX: 24, radiusY: 500})
        ]
    
        layer.add(...children)
        const lastY = CanvasUtils.findLastY(layer)
    
        assert.equal(lastY, 1100)
    })
})