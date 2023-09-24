import React, { useEffect, useRef } from "react";
import { mouseDown, mouseEnter, mouseMove, mouseUpLeave, stageDragBound, stageDragEnd, stageDragMove } from './mouse';
import { useSelector } from "react-redux";
import { Layer, Stage } from 'react-konva';
import boardEvents from "../../base/constants/boardEvents";
import EditManager from "../../lib/EditManager";
import { run } from "../../lib/twiks";
import runCommand from "./native/runCommand";
import Selection from "../../lib/Selection";
import renderVisible from "./image/renderVisible";
import { ToolName } from "../../base/typing/ToolName";
import { lineType } from "../../features/toolSettings";
import { RootState } from "../../store/store";
import Konva from "konva";
import { ICoor } from "../../base/typing/ICoor";
import sizeChange from "./mouse/func/sizeChange";
import BoardManager from "../../lib/BoardManager";


export interface IDrawerProps{
    tool: ToolName,
    color: string,
    lineType: lineType,
    lineSize: number,
    mode: 'local'|'shared'
}

export default function Drawer(props: IDrawerProps){
    const stage = useRef<Konva.Stage | null>(null)
    const stageState = useSelector((state: RootState) => state.stage)
    
    useEffect(() => {
        // create webSocket manager
        const boardManager = new BoardManager({
            handlers: {}
        })
        boardManager.connect()
        // create canvas and editManager
        const canvas: Konva.Layer = stage.current.children[0]
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
        boardEvents.addListener('pageSetted', (pos: ICoor) => {
            stage.current.position(pos)
            renderVisible(canvas)
        })
        boardEvents.addListener('sizeHasChanged', (size: undefined|{ width: number, height: number, baseHeight: number }) => {
            const linesLayer = stage.current.children[2]
            sizeChange(linesLayer, size)
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
                onMouseEnter={(e) => mouseEnter(e, props)}
                onMouseDown={(e) => mouseDown(e, props)}
                onMouseMove={(e) => mouseMove(e, props)}
                onMouseUp={(e) => mouseUpLeave(e, props)}
                onMouseLeave={(e) => mouseUpLeave(e, props)}
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