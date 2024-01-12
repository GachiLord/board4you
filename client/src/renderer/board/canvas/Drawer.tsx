import React, { useContext, useEffect, useRef, useState } from "react";
import { mouseDown, mouseEnter, mouseMove, mouseUpLeave, stageDragBound, stageDragEnd, stageDragMove } from './mouse';
import { useSelector, useDispatch } from "react-redux";
import { Layer, Stage } from 'react-konva';
import { ToolName } from "../../base/typing/ToolName";
import { lineType } from "../../features/toolSettings";
import store, { RootState } from "../../store/store";
import Konva from "konva";
import BoardManager from "../../lib/BoardManager/BoardManager";
import { useLocation, useNavigate, useParams } from "react-router";
import { setMode } from "../../features/board";
import Persister from "../../lib/Persister";
import Alert from "../../base/components/Alert";
import { Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { emptyHistory } from "../../features/history";
import BoardManagerContext from "../../base/constants/BoardManagerContext";
import Loading from "../../base/components/Loading";
import clearCanvas from "./image/clearCanvas";
import { LocaleContext } from "../../base/constants/LocaleContext";
import bootstrap from "./bootstrap";
import isMobile from '../../lib/isMobile'
import useResize from '.././../lib/useResize'


export interface IDrawerProps {
  tool: ToolName,
  color: string,
  lineType: lineType,
  lineSize: number,
}
// persist rooms state
new Persister(store, 'rooms')

export default function Drawer(props: IDrawerProps) {
  // constants
  const mode = useSelector((state: RootState) => state.board.mode)
  const localization = useContext(LocaleContext)
  const boardManager = useContext<BoardManager>(BoardManagerContext)
  // alerts
  const [roomExists, setRoomExists] = useState(true)
  const [isError, setError] = useState(false)
  const [isLoading, setLoading] = useState(mode === 'shared' && roomExists)
  // state
  const dispatch = useDispatch()
  const stage = useRef<Konva.Stage | null>(null)
  const stageState = useSelector((state: RootState) => state.stage)
  // navigation
  const { roomId, inviteId } = useParams()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  // responsiveness stuff
  const { width, height } = useResize()
  const minScale = Math.min(height / stageState.baseHeight, width / stageState.width)
  const scale = Math.max(minScale, 0.5)
  const deviceIsMobile = isMobile()
  const orientationIsPortrait = deviceIsMobile && (screen.orientation.type === 'portrait-primary' || screen.orientation.type === 'portrait-secondary')
  // func
  const cleanUp = () => {
    setError(false)
    setRoomExists(true)
    setLoading(false)
    dispatch(setMode('local'))
    dispatch(emptyHistory())
    if (stage.current) clearCanvas(stage.current.children[0], stage.current.children[1])
  }
  const getStage = () => {
    if (stage.current == null) {
      const plugStage = new Konva.Stage({ container: document.createElement('div') })
      plugStage.add(new Konva.Layer(), new Konva.Layer(), new Konva.Layer())

      return plugStage
    }
    else return stage.current
  }

  useEffect(() => {
    return bootstrap({
      stage: getStage(),
      boardManager,
      mode,
      roomId,
      inviteId,
      setLoading,
      setRoomExists,
      setError,
      navigate,
      cleanUp
    })
  }, [mode, routerLocation])

  return (
    <>
      {orientationIsPortrait && (
        <Alert
          title={localization.changeScreenOrientation}
          body={localization.appIsDesignedToWorkInLandScapeMode}
        />
      )}
      {isError && (
        <Alert
          title={localization.unexpectedError}
          body={localization.tryToReloadThePage}
        />
      )}
      {(isLoading && roomExists) && (
        <Loading title={localization.boardIsLoading} />
      )}
      {
        !roomExists && (
          <Alert
            title={localization.noSuchRoom}
            body={localization.roomDeletedOrDoesNotExist}
          >
            <Link to="/board"><Button variant="primary" onClick={cleanUp}>{localization.createNew}</Button></Link>
            <Link to="/"><Button variant="primary" onClick={cleanUp}>{localization.home}</Button></Link>
          </Alert>
        )
      }
      <div className="d-flex justify-content-center">
        <Stage
          scaleX={deviceIsMobile ? scale : undefined}
          scaleY={deviceIsMobile ? scale : undefined}
          ref={stage}
          height={deviceIsMobile ? stageState.baseHeight * scale : stageState.baseHeight}
          width={deviceIsMobile ? stageState.width * scale : stageState.width}
          className="border"
          style={props.tool !== 'move' ? { "touchAction": "none" } : { "touchAction": "auto" }}
          // mouse
          onMouseEnter={(e) => mouseEnter(e, boardManager, props)}
          onMouseDown={(e) => mouseDown(e, boardManager, props)}
          onMouseMove={(e) => mouseMove(e, boardManager, props)}
          onMouseUp={(e) => mouseUpLeave(e, boardManager, props)}
          onMouseLeave={(e) => mouseUpLeave(e, boardManager, props)}
          // touch events
          onTouchStart={(e) => mouseDown(e, boardManager, props)}
          onTouchMove={(e) => mouseMove(e, boardManager, props)}
          onTouchEnd={(e) => mouseUpLeave(e, boardManager, props)}
          // drag
          draggable={props.tool === 'move'}
          dragBoundFunc={stageDragBound}
          onDragMove={(e) => stageDragMove(e, boardManager)}
          onDragEnd={stageDragEnd}
          // disable context menu on canvas
          onContextMenu={(e) => { e.evt.preventDefault() }}
        >
          <Layer name="canvas" />
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


