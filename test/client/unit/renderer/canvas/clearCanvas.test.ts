import Konva from "konva";
import clearCanvas from "../../../../../src/desktop/renderer/board/canvas/image/clearCanvas";
import LineFactory from "../../../../../src/desktop/renderer/lib/NodeFactories/LineFactory";
import store from "../../../../../src/desktop/renderer/store/store";


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


test('should destroy canvas children', () => {
    const layers = getLayers()

    clearCanvas(layers.canvas, layers.temporaryLayer)

    expect(layers.canvas.children).toHaveLength(0)
})

test('should destroy temporaryLayer children', () => {
    const layers = getLayers()

    clearCanvas(layers.canvas, layers.temporaryLayer)

    expect(layers.temporaryLayer.children).toHaveLength(0)
})

test('should clear history.current', (done) => {
    const layers = getLayers()

    store.subscribe( () => {
        expect(store.getState().history.current).toHaveLength(0)
        done()
    } )

    clearCanvas(layers.canvas, layers.temporaryLayer)    
})

test('should clear history.undone', (done) => {
    const layers = getLayers()

    store.subscribe( () => {
        expect(store.getState().history.undone).toHaveLength(0)
        done()
    } )

    clearCanvas(layers.canvas, layers.temporaryLayer)    
})