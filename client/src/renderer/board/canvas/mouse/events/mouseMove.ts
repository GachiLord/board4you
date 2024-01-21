import store from "../../../../store/store";
import { itemIn, whenDraw } from "../../../../lib/twiks";
import { IDrawerProps } from "../../Drawer";
import { KonvaEventObject } from "konva/lib/Node";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { Ellipse } from "konva/lib/shapes/Ellipse";
import { Arrow } from "konva/lib/shapes/Arrow";
import BoardManager from "../../../../lib/BoardManager/BoardManager";
import CanvasUtils from "../../../../lib/CanvasUtils";
import { ShareData } from "../../share/ShareData";

export default function(e: KonvaEventObject<MouseEvent | TouchEvent>, boardManager: BoardManager, props: IDrawerProps) {
  const tool = props.tool
  const state = store.getState()
  const drawingShapeId = store.getState().stage.drawingShapeId
  const isDrawable = state.stage.isDrawable
  const canDraw = itemIn(state.board.mode, 'author', 'coop')
  const private_id = state.rooms[boardManager.status.roomId]

  const share = (data: ShareData) => {
    if (canDraw)
      boardManager.send('PushSegment', {
        public_id: boardManager.status.roomId,
        private_id: private_id,
        action_type: 'Update',
        data: JSON.stringify(data)
      })
  }
  whenDraw(e, boardManager, ({ stage, pos, canvas, temporary, isRightClick }) => {
    // do nothing if right mouse clicked
    if (isRightClick) return
    // handle tools usage
    if (itemIn(tool, 'pen', 'eraser') && isDrawable && drawingShapeId) {
      const target = e.target
      const lastline: unknown = CanvasUtils.findLastOne(canvas, { shape_id: drawingShapeId })
      // validate lastLine
      if (!(lastline instanceof Line)) throw new TypeError('last created element must be a Line')
      // add ref to eraser line if pointer is on shape
      if (target !== stage && tool === 'eraser') {
        // add connected
        lastline.attrs.connected.add(target.attrs.shape_id)
        // send segments
        share({
          shapeId: target.attrs.shape_id,
          connected: drawingShapeId
        })
      }
      // add points
      lastline.points(lastline.attrs.points.concat([pos.x, pos.y]))
      // send segments
      share({
        shapeId: drawingShapeId,
        addPoints: [pos.x, pos.y]
      })
    }

    else if (itemIn(tool, 'arrow', 'line') && isDrawable && drawingShapeId) {
      const lastLine: unknown = CanvasUtils.findLastOne(canvas, { shape_id: drawingShapeId })
      // validate
      if (!(lastLine instanceof Line || lastLine instanceof Arrow)) throw new TypeError('last created element must be a Line or an Arrow')
      // set points
      if (lastLine.attrs.points.length > 2) lastLine.points(lastLine.attrs.points.slice(0, 2))
      // add points
      lastLine.points(lastLine.attrs.points.concat([pos.x, pos.y]))
      // send segments
      share({
        shapeId: drawingShapeId,
        points: [pos.x, pos.y]
      })
    }
    else if (tool === 'rect' && isDrawable && drawingShapeId) {
      const shape: unknown = CanvasUtils.findLastOne(canvas, { shape_id: drawingShapeId })
      // validate
      if (!(shape instanceof Rect)) throw new TypeError('last created element must be a Rect')
      // prepare new values
      const newWidth = pos.x - shape.attrs.x
      const newHeight = pos.y - shape.attrs.y
      // update
      shape.setAttrs({
        width: newWidth,
        height: newHeight
      })
      // send segments
      share({
        shapeId: drawingShapeId,
        width: newWidth,
        height: newHeight
      })
    }
    else if (tool === 'ellipse' && isDrawable && drawingShapeId) {
      const shape: unknown = CanvasUtils.findLastOne(canvas, { shape_id: drawingShapeId })
      // validate
      if (!(shape instanceof Ellipse)) throw new TypeError('last created element must be an Ellipse')
      // prepare values
      const newRadiusX = Math.abs(pos.x - shape.attrs.x)
      const newRadiusY = Math.abs(pos.y - shape.attrs.y)
      // update
      shape.setAttrs({
        radiusX: newRadiusX,
        radiusY: newRadiusY
      })
      // send segments
      share({
        shapeId: drawingShapeId,
        radiusX: newRadiusX,
        radiusY: newRadiusY
      })
    }
    else if (tool === 'select' && isDrawable && temporary.children[0]) {
      const shape: unknown = temporary.children[0]
      // validate
      if (!(shape instanceof Rect)) throw new TypeError('last created element must be a Rect')
      // update
      shape.setAttrs({
        width: pos.x - shape.attrs.x,
        height: pos.y - shape.attrs.y
      })
    }
  })
}
