import Konva from "konva";
import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";


const layer = new Konva.Layer()
const children = [ 
    new Konva.Line({x:24, y:50, points: [ 241,543,213,214 ], shapeId: '1'}), // max
    new Konva.Line({x:200, y:40, points: [ 11,11,21,122 ], shapeId: '2'}),
    new Konva.Line({x:0, y:10, points: [ 11,28,37,454 ], shapeId: '3'}),
    new Konva.Rect({x:0, y:10, height: 900, width: 400, shapeId: '4'}),
    new Konva.Ellipse({x:0, y:10, radiusY: 900, radiusX: 400, shapeId: '5'}),
]
layer.add(...children)


test('findOne should be able to search by shapeId', () => {
    const shape = CanvasUtils.findOne(layer, {shapeId: '1'})

    expect(shape.attrs.shapeId).toBe('1')
})

test('findOne should not be able to search by object values', () => {
    const shape = CanvasUtils.findOne(layer, {points: [ 241,543,213,214 ]})

    expect(shape).toBeUndefined()
})

test('findOne should be able to search by simple values(string, number and so on)', () => {
    const shape = CanvasUtils.findOne(layer, {x: 24})

    expect(shape.attrs.shapeId).toBe('1')
})

test('findOne should be able to search by simple values(string, number and so on)', () => {
    const shape = CanvasUtils.findOne(layer, {x: 24})

    expect(shape.attrs.shapeId).toBe('1')
})

test('findFew should be able to search by simple values', () =>  {
    const shapes = CanvasUtils.findFew(layer, 'x', [0, 200])

    expect(shapes).toHaveLength(4)
})