import React, { useEffect, useRef } from "react";
import { mouseDown, mouseMove, mouseUp, mouseLeave, stageDragBound, stageDragEnd, stageDragMove } from './mouse';
import { useSelector } from "react-redux";
import { Layer, Stage } from 'react-konva';
import boardEvents from "../../base/boardEvents";
import EditManager from "../../lib/EditManager";
import { run } from "../../lib/twiks";
import runCommand from "./native/runCommand";
import Selection from "../../lib/Selection";
import createDividingLines from "./mouse/func/createDividingLines";
import renderVisible from "./image/renderVisible";


export default function(props){
    const stage = useRef({children: []})
    const stageState = useSelector(state => state.stage)
    
    useEffect(() => {
        const canvas = stage.current.children[0]
        const editManager = new EditManager(canvas)
        // listen for board events 
        boardEvents.addListener('undo', () => {
            Selection.destroy(canvas)
            editManager.undo()

            run( api => {
                api.handleFileChange()
            } )
        })
        boardEvents.addListener('redo', () => {
            Selection.destroy(canvas)
            editManager.redo()
            
            run( api => {
                api.handleFileChange()
            } )
        })
        boardEvents.addListener('pageSetted', (pos) => {
            stage.current.position(pos)
            renderVisible(canvas)
        })
        boardEvents.addListener('sizeHasChanged', () => {
            const linesLayer = stage.current.children[2]
            linesLayer.destroyChildren(linesLayer)
            createDividingLines(linesLayer)
        })
        // web event listeners
        window.addEventListener('paste', (e) => {
            runCommand(stage.current, 'paste', e)
        })
        window.addEventListener('copy', (e) => {
            runCommand(stage.current, 'copy', e)
        })
        window.addEventListener('cut', (e) => {
            runCommand(stage.current, 'cut', e)
        })
        // listen for native events
        run( electron => {
            electron.onMenuButtonClick( (_, o, d) => {runCommand(stage.current, o, d)} )
        })
    }, [])


    return (
        <div className="d-flex justify-content-center">
            <Stage
                ref={stage}
                height={stageState.baseHeight}
                width={stageState.width}
                className="border"
                // mouse
                onMouseDown={(e) => mouseDown(e, props)}
                onMouseMove={(e) => mouseMove(e, props)}
                onMouseUp={(e) => mouseUp(e, props)}
                onMouseLeave={(e) => mouseLeave(e, props)}
                // drag
                draggable={props.tool === 'move'}
                dragBoundFunc={stageDragBound}
                onDragMove={stageDragMove}
                onDragEnd={stageDragEnd}
            >
                <Layer name="canvas"/>
                <Layer
                    name="temporary"
                    listening={false}
                />
                <Layer 
                    name="dividing lines"
                    listening={false}
                />
            </Stage>
        </div>
    )
}