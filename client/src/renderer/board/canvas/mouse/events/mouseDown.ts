import { itemIn, whenDraw } from "../../../../lib/twiks";
import { setDrawable, setDrawingShapeId } from "../../../../features/stage";
import { emptyUndone } from '../../../../features/history'
import { v4 as uuid4 } from 'uuid'
import store from "../../../../store/store";
import CanvasUtils from "../../../../lib/CanvasUtils";
import Konva from "konva";
import primaryColor from '../../../../base/style/primaryColor'
import Selection from "../../../../lib/Selection";
import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";
import BoardManager from "../../../../lib/BoardManager/BoardManager";
import { EmptyActionType, Shape, ShapeType, Tool } from "../../../../lib/protocol";



export default function(e: KonvaEventObject<MouseEvent | TouchEvent>, boardManager: BoardManager, props: IDrawerProps) {
  //shape style vars
  const state = store.getState()
  const tool = props.tool
  const color = props.color
  const lineSize = props.lineSize
  const lineType = props.lineType
  const isDraggable = state.stage.isDraggable
  const canDraw = itemIn(state.board.mode, 'author', 'coop')


  whenDraw(e, boardManager, ({ stage, pos, canvas, temporary, isRightClick }) => {
    const share = (edit: Shape) => {
      // TODO: This part is currently disabled due to the ineffective way used to send websocket messages.
      // Uncomment this, when or if it is improved
      //
      //if (canDraw)
      //  boardManager.send('PushSegment', {
      //    public_id: boardManager.status.roomId,
      //    private_id: private_id,
      //    action_type: 'Start',
      //    data: JSON.stringify(edit)
      //  })
    }

    const undone = store.getState().history.undone.at(-1)
    // empty undone if it exists and tool is not select
    if (undone && tool !== 'select' && tool !== 'move' && !isRightClick) {
      if (canDraw) boardManager.send('Empty', {
        action_type: EmptyActionType.Undone,
        free: () => { }
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
    let shape: Shape | null = null

    // create shape considering the tool
    if (itemIn(tool, 'pen', 'eraser', 'line', 'arrow')) {
      let toolValue = null
      if (tool === 'pen') toolValue = Tool.PenTool
      if (tool === 'eraser') toolValue = Tool.EraserTool
      if (tool === 'line') toolValue = Tool.LineTool
      if (tool === 'arrow') toolValue = Tool.ArrowTool

      shape = {
        tool: toolValue,
        points: Uint32Array.from([pos.x, pos.y]),
        shape_type: tool === 'arrow' ? ShapeType.Arrow : ShapeType.Line,
        color: tool !== 'eraser' ? color : '#ffffff',
        shape_id: uuid4(),
        x: 0,
        y: 0,
        line_size: lineSize,
        line_type: lineType,
        connected: [],
        radius_x: 0,
        radius_y: 0,
        height: 0,
        width: 0,
        rotation: 0,
        scale_x: 1,
        scale_y: 1,
        skew_x: 0,
        skew_y: 0,
        url: "",

        free() { }
      }

      // add shape to canvas
      canvas.add(CanvasUtils.toKonvaObject(shape))
      // save active shapeId
      store.dispatch(setDrawingShapeId(shape.shape_id))
      // send segment
      share(shape)
    }
    else if (tool === 'rect') {
      shape = {
        tool: Tool.RectTool,
        shape_type: ShapeType.Rect,
        x: pos.x,
        y: pos.y,
        height: 0,
        width: 0,
        color: color,
        shape_id: uuid4(),
        line_size: lineSize,
        line_type: lineType,
        rotation: 0,
        scale_x: 1,
        scale_y: 1,
        skew_x: 0,
        skew_y: 0,
        radius_y: 0,
        radius_x: 0,
        url: "",
        connected: [],
        points: Uint32Array.from([]),
        free() { }
      }
      canvas.add(CanvasUtils.toKonvaObject(shape))
      // save active shapeId
      store.dispatch(setDrawingShapeId(shape.shape_id))
      // send segment
      share(shape)
    }
    else if (tool === 'ellipse') {
      shape = {
        tool: Tool.EllipseTool,
        shape_type: ShapeType.Ellipse,
        x: pos.x,
        y: pos.y,
        radius_y: 0,
        radius_x: 0,
        height: 0,
        width: 0,
        color: color,
        shape_id: uuid4(),
        line_size: lineSize,
        line_type: lineType,
        rotation: 0,
        scale_x: 1,
        scale_y: 1,
        skew_x: 0,
        skew_y: 0,
        url: "",
        connected: [],
        points: Uint32Array.from([]),
        free() { }
      }
      canvas.add(CanvasUtils.toKonvaObject(shape))
      // save active shapeId
      store.dispatch(setDrawingShapeId(shape.shape_id))
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
          if (s.attrs.connected.has(e.target.attrs.shape_id) && s instanceof Konva.Shape) connected.push(s)
        })
        // create transformer for them
        if (e.target instanceof Konva.Shape) Selection.create([e.target, ...connected], boardManager)
      }
    }
  })
}
