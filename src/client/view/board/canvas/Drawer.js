import React, { useEffect, useRef } from "react";
import { mouseDown, mouseMove, mouseUp, mouseLeave, stageDragBound } from './mouse/';
import { useSelector } from "react-redux";
import { Layer, Stage } from 'react-konva';
import boardEvents from "../../base/boardEvents";
import EditManager from "../../../lib/EditManager";



export default function(props){
    const stage = useRef({children: []})
    // define redux reducers
    const stageState = useSelector(state => state.stage)
    // listen for board events
    useEffect(() => {
        const editManager = new EditManager(stage.current.children[0])
        boardEvents.addListener('undo', () => {
            editManager.undo()
        })
        boardEvents.addListener('redo', () => {
            editManager.redo()
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
                <Layer/>
                <Layer></Layer>
            </Stage>
        </div>
    )
}