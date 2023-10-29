import Konva from "konva";
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";
import { test, describe } from "node:test"
import assert from "node:assert"


const layer = new Konva.Layer()
const children = [ 
    new Konva.Line({x:24, y:50, points: [ 241,543,213,214 ], shapeId: '1'}), // max
    new Konva.Line({x:200, y:40, points: [ 11,11,21,122 ], shapeId: '2'}),
    new Konva.Line({x:0, y:10, points: [ 11,28,37,454 ], shapeId: '3'}),
    new Konva.Rect({x:0, y:10, height: 900, width: 400, shapeId: '4'}),
    new Konva.Ellipse({x:0, y:10, radiusY: 900, radiusX: 400, shapeId: '5'}),
]
layer.add(...children)


describe('findMehods', () => {
    test('findOne should be able to search by shapeId', () => {
        const shape = CanvasUtils.findOne(layer, {shapeId: '1'})
    
        assert.equal(shape.attrs.shapeId, '1')
    })
    
    test('findOne should not be able to search by object values', () => {
        const shape = CanvasUtils.findOne(layer, {points: [ 241,543,213,214 ]})
    
        assert.equal(shape, undefined)
    })
    
    test('findOne should be able to search by simple values(string, number and so on)', () => {
        const shape = CanvasUtils.findOne(layer, {x: 24})
    
        assert.equal(shape.attrs.shapeId, '1')
    })
    
    test('findOne should be able to search by simple values(string, number and so on)', () => {
        const shape = CanvasUtils.findOne(layer, {x: 24})
    
        assert.equal(shape.attrs.shapeId, '1')
    })
    
    test('findFew should be able to search by simple values', () =>  {
        const shapes = CanvasUtils.findFew(layer, 'x', [0, 200])
    
        assert.equal(shapes.length, 4)
    })
})