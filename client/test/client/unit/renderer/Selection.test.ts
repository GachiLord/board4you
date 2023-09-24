import Konva from "konva";
import LineFactory from "../../../../src/renderer/lib/NodeFactories/LineFactory";
import Selection from "../../../../src/renderer/lib/Selection";



function getTestCase(amount = 5){
    const factory = new LineFactory()
    const lines = factory.create(amount)
    const layer = new Konva.Layer()
    layer.add(...lines)

    return {
        shapes: lines,
        layer: layer
    }
}

test('should throw an error if there is no shapes', () => {
    expect( () => { 
        Selection.create([])
    } )
    .toThrow()
})

test('should not throw error if there are shapes', () => {
    expect( () => { 
        const shapes = getTestCase().shapes

        Selection.create(shapes)
    } )
    .not.toThrow()
})

test('added shapes should be draggable', () => {
    const testCase = getTestCase(5)

    Selection.create(testCase.shapes)

    const added = testCase.layer.children.filter( s => s.attrs.draggable === true )
    expect(added).toHaveLength(5)
})

test('layer should have transformer after creation', () => {
    const testCase = getTestCase(5)

    Selection.create(testCase.shapes)

    const transformers = testCase.layer.children.filter( s => s instanceof Konva.Transformer )
    expect(transformers).toHaveLength(1)
})

test('removed shapes should not be draggable', () => {
    const testCase = getTestCase(5)

    Selection.create(testCase.shapes)
    Selection.destroy(testCase.layer)

    const added = testCase.layer.children.filter( s => s.attrs.draggable === false )
    expect(added).toHaveLength(5)
})

test('layer should not have transformer after destroy', () => {
    const testCase = getTestCase(5)

    Selection.create(testCase.shapes)
    Selection.destroy(testCase.layer)

    const transformers = testCase.layer.children.filter( s => s instanceof Konva.Transformer )
    expect(transformers).toHaveLength(0)
})