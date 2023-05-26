import React, { useEffect, useRef } from "react";
import { mouseDown, mouseMove, mouseUp, mouseLeave, stageDragBound } from './mouse/';
import { useSelector } from "react-redux";
import { Layer, Stage } from 'react-konva';
import boardEvents from "../../base/boardEvents";
import EditManager from "../../../lib/EditManager";
import { removeTransformers, run } from "../../../lib/twiks";
import runCommand from "./native/runCommand";



export default function(props){
    const stage = useRef({children: []})
    const stageState = useSelector(state => state.stage)
    
    useEffect(() => {
        const canvas = stage.current.children[0]
        const editManager = new EditManager(canvas)
        // listen for board events 
        boardEvents.addListener('undo', () => {
            removeTransformers(canvas)
            editManager.undo()
        })
        boardEvents.addListener('redo', () => {
            removeTransformers(canvas)
            editManager.redo()
        })
        // web event listeners
        window.addEventListener('paste', (e) => {
            // implement
        })
        window.addEventListener('copy', () => {
            // implement
        })
        window.addEventListener('cut', () => {
            // implement
        })
        // listen for native events
        run( electron => {
            electron.onMenuButtonClick( (_, o, d) => {runCommand(canvas, o, d)} )
        })
    }, [])


    return (
        <div className="d-flex justify-content-center">
            <Stage
                ref={stage}
                height={stageState.height}
                width={stageState.width}
                className="border"
                onMouseDown={(e) => mouseDown(e, props)}
                onMouseMove={(e) => mouseMove(e, props)}
                onMouseUp={(e) => mouseUp(e, props)}
                onMouseLeave={(e) => mouseLeave(e, props)}
                draggable={props.tool === 'move'}
                dragBoundFunc={stageDragBound}
            >
                <Layer />
                <Layer />
            </Stage>
        </div>
    )
}