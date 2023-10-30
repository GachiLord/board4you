import Konva from "konva";
import LineFactory from "../../../src/renderer/lib/NodeFactories/LineFactory";
import Selection from "../../../src/renderer/lib/Selection";
import BoardManager from "../../../src/renderer/lib/BoardManager/BoardManager";
import { test, describe } from "node:test"
import assert from "node:assert"


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

describe('unit/renderer/Selection', () => {
    // @ts-ignore
    global.location = {
        protocol: 'http',
        host: 'localhost'
    }
    test('should throw an error if there is no shapes', () => {
        assert.throws( () => { 
            Selection.create([], new BoardManager())
        } )
    })
    
    test('should not throw error if there are shapes', () => {
        assert.doesNotThrow( () => { 
            const shapes = getTestCase().shapes
    
            Selection.create(shapes, new BoardManager())
        } )
    })
    
    test('added shapes should be draggable', () => {
        const testCase = getTestCase(5)
    
        Selection.create(testCase.shapes, new BoardManager())
    
        const added = testCase.layer.children.filter( s => s.attrs.draggable === true )
        assert.equal(added.length, 5)
    })
    
    test('layer should have transformer after creation', () => {
        const testCase = getTestCase(5)
    
        Selection.create(testCase.shapes, new BoardManager())
    
        const transformers = testCase.layer.children.filter( s => s instanceof Konva.Transformer )
        assert.equal(transformers.length, 1)
    })
    
    test('removed shapes should not be draggable', () => {
        const testCase = getTestCase(5)
    
        Selection.create(testCase.shapes, new BoardManager())
        Selection.destroy(testCase.layer)
    
        const added = testCase.layer.children.filter( s => s.attrs.draggable === false )
        assert.equal(added.length, 5)
    })
    
    test('layer should not have transformer after destroy', () => {
        const testCase = getTestCase(5)
    
        Selection.create(testCase.shapes, new BoardManager())
        Selection.destroy(testCase.layer)
    
        const transformers = testCase.layer.children.filter( s => s instanceof Konva.Transformer )
        assert.equal(transformers.length, 0)
    })
} )