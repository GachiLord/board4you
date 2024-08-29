import CanvasUtils from "../../../../lib/CanvasUtils";
import { itemIn, run, whenDraw } from "../../../../lib/twiks";
import { setDrawable } from "../../../../features/stage";
import { addCurrent } from "../../../../features/history";
import store from "../../../../store/store";
import Konva from "konva";
import Selection from "../../../../lib/Selection";
import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { Ellipse } from "konva/lib/shapes/Ellipse";
import { IRect } from "konva/lib/types";
import { Arrow } from "konva/lib/shapes/Arrow";
import { setCursor } from "../func/cursor";
import BoardManager from "../../../../lib/BoardManager/BoardManager";
import { Edit } from "../../../../lib/EditManager";
import { convertToEnum } from "../../share/convert";


export default function(e: KonvaEventObject<MouseEvent | TouchEvent>, boardManager: BoardManager, props: IDrawerProps) {
  const state = store.getState()
  const canDraw = itemIn(state.board.mode, 'author', 'coop')
  const isDrawing = state.stage.isDrawable
  const drawingShapeId = state.stage.drawingShapeId
  const tool = props.tool

  whenDraw(e, boardManager, ({ stage, canvas, temporary, isRightClick }) => {
    // if right mouse clicked set cursor according tool
    // share fun
    const shareSegment = (shapeId: string) => {
      // TODO: This part is currently disabled due to the ineffective way used to send websocket messages.
      // Uncomment this, when or if it is improved
      //
      //if (canDraw)
      //  boardManager.send('PushSegment', {
      //    public_id: boardManager.status.roomId,
      //    private_id: private_id,
      //    action_type: 'End',
      //    data: shapeId
      //  })
    }
    const share = (edit: Edit) => {
      // TODO: This part is currently changed to send only already drawn edits. This improves perfomance when app has many users.
      // Set 'silent' to true, when or if app is ready to process so many messages.
      //
      if (canDraw)
        boardManager.send('Push', {
          data: ([convertToEnum(edit)]),
          silent: false // true
        })
    }
    // type of event
    const isMouseLeave = e.type === 'mouseleave'

    if (isMouseLeave) setCursor(stage)
    if (isRightClick || stage.isDragging()) {
      stage.stopDrag()
      return
    }
    run(api => {
      if (!itemIn(tool, 'move', 'select') && !isMouseLeave) api.handleFileChange()
    })

    if (itemIn(tool, 'pen', 'eraser', 'arrow', 'line') && isDrawing && drawingShapeId) {
      const lastLine: unknown = CanvasUtils.findLastOne(canvas, { shape_id: drawingShapeId })
      // validate lastLine
      if (!(lastLine instanceof Line || lastLine instanceof Arrow)) throw new TypeError('last created element must be a Line or an Arrow')
      // save
      const points = lastLine.attrs.points

      if (points.length === 2) {
        lastLine.points([points[0] + 1, points[1] + 1, points[0] - 1, points[1]])
      }
      // cache the line to improve perfomance
      lastLine.cache()
      // add line to history
      // @ts-ignore
      store.dispatch(addCurrent({ id: lastLine.attrs.shape_id, shape: CanvasUtils.toShape(lastLine, true) }))
      const edit: Edit = { id: lastLine.attrs.shape_id, shape: CanvasUtils.toShape(lastLine), free() { } };
      // send PushSegmentEnd msg
      shareSegment(drawingShapeId)
      share(edit)
    }
    else if (itemIn(tool, 'rect', 'ellipse') && isDrawing && drawingShapeId) {
      const lastShape: unknown = CanvasUtils.findLastOne(canvas, { shape_id: drawingShapeId })
      // validate lastLine
      if (!(lastShape instanceof Rect || lastShape instanceof Ellipse)) throw new TypeError('last created element must be an Ellipse or Rect')
      // save
      // @ts-ignore
      const edit: Edit = { id: lastShape.attrs.shape_id, shape: CanvasUtils.toShape(lastShape, true) }
      store.dispatch(addCurrent(edit))
      // send PushSegmentEnd msg
      shareSegment(drawingShapeId)
      share(edit)
    }
    else if (tool === 'select' && isDrawing && temporary.children[0]) {
      const shapes = canvas.children
      const box = temporary.children[0]
      // validate
      if (!(box instanceof Konva.Rect)) throw new TypeError(`last created temporary shape must be a Rect`)
      const clientRect: IRect = box.getClientRect()
      // offset negative wifth and height
      if (clientRect.width < 0) {
        clientRect.x += box.width()
        clientRect.width = Math.abs(clientRect.width)
      }
      if (clientRect.height < 0) {
        clientRect.y += clientRect.height
        clientRect.height = Math.abs(clientRect.height)
      }

      const selected: Set<Konva.Shape> = new Set()
      let resizable: boolean = null
      // find shapes which have interception with clientRect
      shapes.forEach(shape => {
        if (Konva.Util.haveIntersection(clientRect, shape.getClientRect())) {
          resizable = shape.attrs.connected.size === 0 && resizable !== false

          if (shape instanceof Konva.Shape) selected.add(shape)
          shapes.forEach(i => {
            if (i.attrs.connected.has(shape.attrs.shape_id) && i instanceof Konva.Shape) {
              selected.add(i)
            }
          })
        }
      })
      // create transformer for them
      if (selected.size !== 0) {
        Selection.create([...selected], boardManager)
      }
      box.destroy()
    }
  })


  store.dispatch(setDrawable(false))
}
