import React, { useEffect, useRef, useState } from "react";
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
import store, { RootState } from "../../store/store";
import Konva from "konva";
import { ICoor } from "../../base/typing/ICoor";
import sizeChange from "./mouse/func/sizeChange";
import BoardManager from "../../lib/BoardManager/BoardManager";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { setMode } from "../../features/board";
import { setRoom } from "../../features/rooms";
import Persister from "../../lib/Persister";
import handlePush from "./share/handlePush";
import Alert from "../../base/components/Alert";
import { Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import handlePushStart from "./share/handlePushStart";
import handlePushEnd from "./share/handlePushEnd";
import handlePushUpdate from "./share/handlePushUpdate";
import { PushSegmentData } from "../../lib/BoardManager/typing";
import { emptyCurrent, emptyHistory, emptyUndone } from "../../features/history";
import keyPressToCommand from "./native/keyPressToCommand";


export interface IDrawerProps{
    tool: ToolName,
    color: string,
    lineType: lineType,
    lineSize: number,
}

// create webSocket manager
const boardManager = new BoardManager()
// persist rooms state
new Persister(store, 'rooms')

export default function Drawer(props: IDrawerProps){
    const dispatch = useDispatch()
    const stage = useRef<Konva.Stage | null>(null)
    const stageState = useSelector((state: RootState) => state.stage)
    const mode = useSelector((state: RootState) => state.board.mode)
    const [roomExists, setRoomExists] = useState(true)
    const { roomId } = useParams()
    
    useEffect(() => {
        // create canvas and editManager
        const canvas: Konva.Layer = stage.current.children[0]
        const editManager = new EditManager(canvas, boardManager)
        // create room if mode has changed and we are not going to edit existing one 
        if (mode === 'shared' && !roomId){
            // implement loading logic!
            const history = store.getState().history
            BoardManager.createRoom({current: history.current, undone: history.undone}).then( roomInfo => {
                // replace current location to prevent share button blocking
                location.replace(`${location.origin}/edit/${roomInfo.public_id}`)
                // save privateId to continue editing after reload
                dispatch(setRoom({ publicId: roomInfo.public_id, privateId: roomInfo.private_id }))
            } )
        }
        // update mode to run effect again
        if (roomId){
            dispatch(setMode('shared'))
        }
        // join room if mode is shared
        if (mode === 'shared'){
            boardManager.connect().then( () => {
                boardManager.joinRoom(roomId)
                    // alert if there is no such room 
                    .catch(() => setRoomExists(false))
            } )
        }
        // listen for Push msgs
        boardManager.handlers.onMessage = (msg) => {
            const parsed = JSON.parse(msg)
            const key = Object.keys(parsed)[0]
            const data = parsed[key]

            switch(key){
                case 'PushData':{
                    handlePush(editManager, data.data)
                    break
                }
                case 'PushSegmentData':{
                    const segment: PushSegmentData = data
                    const t = segment.action_type
                    if (t === 'Start') handlePushStart(canvas, JSON.parse(segment.data))
                    if (t === 'Update') handlePushUpdate(canvas, JSON.parse(segment.data))
                    if (t === 'End') handlePushEnd(canvas, segment.data)
                    break
                }
                case 'UndoRedoData':{
                    if (data.action_type === 'Undo') editManager.undo(data.action_id)
                    else editManager.redo(data.action_id)
                    break
                }
                case 'EmptyData':{
                    const t = data.action_type 
                    if (t === 'undone') store.dispatch(emptyUndone())
                    if (t === 'current') store.dispatch(emptyCurrent())
                    if (t === 'history') store.dispatch(emptyHistory())
                    break
                }
            }
        }    
        // handle errors
        boardManager.handlers.onError = () => setRoomExists(false)     
        // listen for board events
        const undoSub = boardEvents.addListener('undo', () => {
            Selection.destroy(canvas)
            editManager.undo()

            run( api => {
                api.handleFileChange()
            } )
        })
        const redoSub = boardEvents.addListener('redo', () => {
            Selection.destroy(canvas)
            editManager.redo()
            
            run( api => {
                api.handleFileChange()
            } )
        })
        const pageSettedSub = boardEvents.addListener('pageSetted', (pos: ICoor) => {
            stage.current.position(pos)
            renderVisible(canvas)
        })
        const sizeHasChangedSub = boardEvents.addListener('sizeHasChanged', (size: undefined|{ width: number, height: number, baseHeight: number }) => {
            const linesLayer = stage.current.children[2]
            sizeChange(linesLayer, size)
        })
        // web event listeners
        // paste
        const handlePaste = (e: ClipboardEvent) => {
            runCommand(stage.current, boardManager, 'paste', e)
        }
        window.addEventListener('paste', handlePaste)
        // copy
        const handleCopy = (e: ClipboardEvent) => {
            runCommand(stage.current, boardManager, 'copy', e)
        }
        window.addEventListener('copy', handleCopy)
        // cut
        const handleCut = (e: ClipboardEvent) => {
            runCommand(stage.current, boardManager, 'cut', e)
        }
        window.addEventListener('cut', handleCut)
        // listen for keyboard and main process events
        run( electron => {
            electron.onMenuButtonClick( (_, o, d) => {runCommand(stage.current, boardManager, o, d)} )
        },
        () => {
            window.addEventListener('keypress', (e) => {
                const command = keyPressToCommand(e)
                command && runCommand(stage.current, boardManager, command)
            })
        })
        // remove all listeners on unmount
        return () => {
            // boardevents
            [undoSub, redoSub, pageSettedSub, sizeHasChangedSub].forEach( s => s.remove() )
            // web events
            window.removeEventListener('paste', handlePaste)
            window.removeEventListener('copy', handleCopy)
            window.removeEventListener('cut', handleCut)
            // set local mode
            dispatch(setMode('local'))
            // disconnect
            boardManager.disconnect()
        }
    }, [mode])


    return  (
        <>
        {
        !roomExists && (
            <Alert 
                title="There is no sush room"
                body="Room is deleted or does not exit"
            >
                <Link to="/edit" reloadDocument><Button variant="primary">Create new</Button></Link>
                <Link to="/"><Button variant="primary">Home</Button></Link>
            </Alert>
        )
        }
        <div className="d-flex justify-content-center">
            <Stage
                ref={stage}
                height={stageState.baseHeight}
                width={stageState.width}
                className="border"
                // mouse
                onMouseEnter={(e) => mouseEnter(e, boardManager, props)}
                onMouseDown={(e) => mouseDown(e, boardManager, props)}
                onMouseMove={(e) => mouseMove(e, boardManager, props)}
                onMouseUp={(e) => mouseUpLeave(e, boardManager, props)}
                onMouseLeave={(e) => mouseUpLeave(e, boardManager, props)}
                // drag
                draggable={props.tool === 'move'}
                dragBoundFunc={stageDragBound}
                onDragMove={(e) => stageDragMove(e, boardManager)}
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
        </>
    )
}