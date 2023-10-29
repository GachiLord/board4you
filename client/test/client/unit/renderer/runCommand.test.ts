import Konva from "konva";
import runCommand from "../../../../src/renderer/board/canvas/native/runCommand";
import boardEvents from "../../../../src/renderer/base/constants/boardEvents";
import LineFactory from "../../../../src/renderer/lib/NodeFactories/LineFactory";
import store from "../../../../src/renderer/store/store";
import { setSelection } from "../../../../src/renderer/features/select";
import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils";
import BoardManager from "../../../../src/renderer/lib/BoardManager/BoardManager";
import { test, describe } from "node:test"
import assert from "node:assert"


function getCase(count = 5){
    const stage = new Konva.Stage({ container: document.createElement('div') })
    const canvas = new Konva.Layer()
    const temporaryLayer = new Konva.Layer()
    const factory = new LineFactory()
    canvas.add(...factory.create(count))
    stage.add(canvas, temporaryLayer)


    return {
        stage: stage,
        boardManager: new BoardManager(),
        canvas: canvas,
        temporaryLayer: temporaryLayer
    }
}

describe('runCommand', () => {
    test('newFile should clear canvas', () => {
        const testCase = getCase()
    
        runCommand(testCase.stage, testCase.boardManager, 'newFile', undefined)
    
        assert.equal(testCase.canvas.children.length, 0)
    })
    
    test('newFile should change stage position to {x:0,y:0}', () => {
        const testCase = getCase()
        testCase.stage.position({x: 1, y: 2})
    
        runCommand(testCase.stage, testCase.boardManager, 'newFile', undefined)
    
        assert.strictEqual(testCase.stage.position(), {x:0,y:0})
    })
    
    test('newFile should change stagePos to {x:0,y:0}', (_, done) => {
        const testCase = getCase()
        testCase.stage.position({x: 1, y: 2})
    
        const usub = store.subscribe( () => {
            assert.strictEqual(store.getState().stage.stagePos, {x: 0, y: 0})
            usub()
            done()
        } )
    
        runCommand(testCase.stage, testCase.boardManager, 'newFile', undefined)
    })
    
    test('selectSize should emit event', (_, done) => {
        const stage = getCase().stage
    
        boardEvents.once('selectSize', () => done())
    
        runCommand(stage, new BoardManager(), 'selectSize', undefined)
    })
    
    test('undo should destroy Selection', () => {
        const testCase = getCase(5)
        const trf = new Konva.Transformer()
        testCase.canvas.add(trf)
    
        runCommand(testCase.stage, testCase.boardManager, 'undo', undefined)
    
        assert.ok(!testCase.canvas.children.includes(trf))
    })
    
    test('redo should destroy Selection', () => {
        const testCase = getCase(5)
        const trf = new Konva.Transformer()
        testCase.canvas.add(trf)
    
        runCommand(testCase.stage, testCase.boardManager, 'redo', undefined)
    
        assert.ok(!testCase.canvas.children.includes(trf))
    })
    
    test('del should destroy Selection children', () => {
        const testCase = getCase(5)
        const trf = new Konva.Transformer()
        
        store.dispatch( setSelection(testCase.canvas.children.map( (s: any) => CanvasUtils.toShape(s) )) )
        trf.nodes(testCase.canvas.children)
        testCase.canvas.add(trf)
    
        runCommand(testCase.stage, testCase.boardManager, 'del', undefined)
    
        assert.equal(testCase.canvas.children.length, 0)
    })
})
