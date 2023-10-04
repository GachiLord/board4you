/**
 * @jest-environment jsdom
 */
import Konva from "konva";
import runCommand from "../../../../src/renderer/board/canvas/native/runCommand";
import boardEvents from "../../../../src/renderer/base/constants/boardEvents";
import LineFactory from "../../../../src/renderer/lib/NodeFactories/LineFactory";
import store from "../../../../src/renderer/store/store";
import { setSelection } from "../../../../src/renderer/features/select";
import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils";
import BoardManager from "../../../../src/renderer/lib/BoardManager/BoardManager";


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

test('newFile should clear canvas', () => {
    const testCase = getCase()

    runCommand(testCase.stage, testCase.boardManager, 'newFile', undefined)

    expect(testCase.canvas.children).toHaveLength(0)
})

test('newFile should change stage position to {x:0,y:0}', () => {
    const testCase = getCase()
    testCase.stage.position({x: 1, y: 2})

    runCommand(testCase.stage, testCase.boardManager, 'newFile', undefined)

    expect(testCase.stage.position()).toStrictEqual({x: 0, y:0})
})

test('newFile should change stagePos to {x:0,y:0}', (done) => {
    const testCase = getCase()
    testCase.stage.position({x: 1, y: 2})

    const usub = store.subscribe( () => {
        expect(store.getState().stage.stagePos).toStrictEqual({x: 0, y: 0})
        usub()
        done()
    } )

    runCommand(testCase.stage, testCase.boardManager, 'newFile', undefined)
})

test('selectSize should emit event', (done) => {
    const stage = getCase().stage

    boardEvents.once('selectSize', () => done())

    runCommand(stage, new BoardManager(), 'selectSize', undefined)
})

test('undo should destroy Selection', () => {
    const testCase = getCase(5)
    const trf = new Konva.Transformer()
    testCase.canvas.add(trf)

    runCommand(testCase.stage, testCase.boardManager, 'undo', undefined)

    expect(testCase.canvas.children).not.toContain(trf)
})

test('redo should destroy Selection', () => {
    const testCase = getCase(5)
    const trf = new Konva.Transformer()
    testCase.canvas.add(trf)

    runCommand(testCase.stage, testCase.boardManager, 'redo', undefined)

    expect(testCase.canvas.children).not.toContain(trf)
})

test('del should destroy Selection children', () => {
    const testCase = getCase(5)
    const trf = new Konva.Transformer()
    
    store.dispatch( setSelection(testCase.canvas.children.map( (s: any) => CanvasUtils.toShape(s) )) )
    trf.nodes(testCase.canvas.children)
    testCase.canvas.add(trf)

    runCommand(testCase.stage, testCase.boardManager, 'del', undefined)

    expect(testCase.canvas.children).toHaveLength(0)
})
