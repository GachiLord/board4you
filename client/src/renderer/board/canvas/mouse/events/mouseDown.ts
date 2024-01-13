import { itemIn, whenDraw } from "../../../../lib/twiks";
import { setDrawable, setDrawingShapeId } from "../../../../features/stage";
import { emptyUndone } from '../../../../features/history'
import { v4 as uuid4 } from 'uuid'
import store from "../../../../store/store";
import CanvasUtils from "../../../../lib/CanvasUtils";
import Konva from "konva";
import primaryColor from '../../../../base/style/primaryColor'
import Selection from "../../../../lib/Selection";
import IShape from "../../../../base/typing/IShape";
import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";
import BoardManager from "../../../../lib/BoardManager/BoardManager";



export default function(e: KonvaEventObject<MouseEvent | TouchEvent>, boardManager: BoardManager, props: IDrawerProps) {
  //shape style vars
  const state = store.getState()
  const tool = props.tool
  const color = props.color
  const lineSize = props.lineSize
  const lineType = props.lineType
  const isDraggable = state.stage.isDraggable
  const canDraw = itemIn(state.board.mode, 'author', 'coop')
  const private_id = state.rooms[boardManager.status.roomId ? boardManager.status.roomId : "none"]


  whenDraw(e, boardManager, ({ stage, pos, canvas, temporary, isRightClick }) => {
    const share = (edit: IShape) => {
      if (canDraw)
        boardManager.send('PushSegment', {
          public_id: boardManager.status.roomId,
          private_id: private_id,
          action_type: 'Start',
          data: JSON.stringify(edit)
        })
    }

    const undone = store.getState().history.undone.at(-1)
    // empty undone if it exists and tool is not select
    if (undone && tool !== 'select' && tool !== 'move' && !isRightClick) {
      if (canDraw) boardManager.send('Empty', {
        public_id: boardManager.status.roomId,
        private_id: private_id,
        action_type: 'undone'
      })
      store.dispatch(emptyUndone())
    }
    else if (isRightClick) {
      // start dragging if right clicked
      stage.startDrag()
      return
    }
    Selection.destroy(canvas)
    // start drawing
    store.dispatch(setDrawable(true))
    // create shape
    let shape: IShape | null = null

    // create shape considering the tool
    if (itemIn(tool, 'pen', 'eraser', 'line', 'arrow')) {

      shape = {
        tool: tool,
        points: [pos.x, pos.y],
        type: tool === 'arrow' ? 'arrow' : 'line',
        color: tool !== 'eraser' ? color : '#ffffff',
        shapeId: uuid4(),
        x: 0,
        y: 0,
        lineSize: lineSize,
        lineType: lineType,
        connected: []
      }

      // add shape to canvas
      canvas.add(CanvasUtils.toKonvaObject(shape))
      // save active shapeId
      store.dispatch(setDrawingShapeId(shape.shapeId))
      // send segment
      share(shape)
    }
    else if (tool === 'rect') {
      shape = {
        tool: tool,
        type: tool,
        x: pos.x,
        y: pos.y,
        height: 0,
        width: 0,
        color: color,
        shapeId: uuid4(),
        lineSize: lineSize,
        lineType: lineType,
      }
      canvas.add(CanvasUtils.toKonvaObject(shape))
      // save active shapeId
      store.dispatch(setDrawingShapeId(shape.shapeId))
      // send segment
      share(shape)
    }
    else if (tool === 'ellipse') {
      shape = {
        tool: tool,
        type: tool,
        x: pos.x,
        y: pos.y,
        radiusY: 0,
        radiusX: 0,
        color: color,
        shapeId: uuid4(),
        lineSize: lineSize,
        lineType: lineType,
      }
      canvas.add(CanvasUtils.toKonvaObject(shape))
      // save active shapeId
      store.dispatch(setDrawingShapeId(shape.shapeId))
      // send segment
      share(shape)
    }
    else if (tool === 'select' && !isDraggable && e.target.attrs.id !== 'selectRect') {
      // select multiple shapes
      if (e.target === stage) {
        const shape = new Konva.Rect({
          x: pos.x,
          y: pos.y,
          height: 0,
          width: 0,
          stroke: primaryColor,
          strokeWidth: 2,
          opacity: 0.8,
          dash: [5, 5],
          id: 'selectRect',
          shadowForStrokeEnabled: false,
        })

        temporary.add(shape)
      }
      // select only clicked shape
      else {
        const connected: Konva.Shape[] = []
        // find shapes which have interception with clientRect
        canvas.children.forEach(s => {
          if (s.attrs.connected.has(e.target.attrs.shapeId) && s instanceof Konva.Shape) connected.push(s)
        })
        // create transformer for them
        if (e.target instanceof Konva.Shape) Selection.create([e.target, ...connected], boardManager)
      }
    }
  })


}
