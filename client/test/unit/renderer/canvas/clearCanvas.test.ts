import Konva from "konva";
import clearCanvas from "../../../../src/renderer/board/canvas/image/clearCanvas";
import LineFactory from "../../../../src/renderer/lib/NodeFactories/LineFactory";
import store from "../../../../src/renderer/store/store";
import { test, describe } from "node:test"
import assert from "node:assert"


function getLayers(){
    const factory = new LineFactory()
    const canvas = new Konva.Layer()
    const temporaryLayer = new Konva.Layer()

    canvas.add(...factory.create(5))
    temporaryLayer.add(...factory.create(5))

    return {
        canvas: canvas,
        temporaryLayer: temporaryLayer
    }
}


describe("unit/renderer/canvas/clearCanvas", () => {
    test('should destroy canvas children', () => {
        const layers = getLayers()
    
        clearCanvas(layers.canvas, layers.temporaryLayer)
    
        assert.equal(layers.canvas.children.length, 0)
    })
    
    test('should destroy temporaryLayer children', () => {
        const layers = getLayers()
    
        clearCanvas(layers.canvas, layers.temporaryLayer)
    
        assert.equal(layers.temporaryLayer.children.length, 0)
    })
    
    test('should clear history.current', (_, done) => {
        const layers = getLayers()
    
        const unsub = store.subscribe( () => {
            unsub()
            assert.equal(store.getState().history.current.length, 0)
            done()
        } )
    
        clearCanvas(layers.canvas, layers.temporaryLayer)    
    })
    
    test('should clear history.undone', (_, done) => {
        const layers = getLayers()
    
        const unsub = store.subscribe( () => {
            unsub()
            assert.equal(store.getState().history.undone.length, 0)
            done()
        } )
    
        clearCanvas(layers.canvas, layers.temporaryLayer)    
    })
})