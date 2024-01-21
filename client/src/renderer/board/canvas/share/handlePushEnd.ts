import Konva from "konva";
import CanvasUtils from "../../../lib/CanvasUtils";
import { addCurrent } from "../../../features/history";
import store from "../../../store/store";
import { itemIn } from "../../../lib/twiks";
import { setHeight } from "../../../features/stage";
import boardEvents from "../../../base/constants/boardEvents";
import pull from "./pull";
import BoardManager from "../../../lib/BoardManager/BoardManager";

export default function handlePushEnd(canvas: Konva.Layer, boardManager: BoardManager, shapeId: string) {
  const shape = CanvasUtils.findLastOne(canvas, { shape_id: shapeId })
  // if shape isn't on canvas, it might hasn't been sended from server due to the race-condition
  if (!shape) {
    // stop function execution and
    // make pull to fetch that shape
    pull(boardManager)
    return
  }
  if (!(shape instanceof Konva.Shape)) throw new TypeError('shape must be Konva.Shape')
  // save edit
  store.dispatch(addCurrent(
    { id: shape.attrs.shape_id, edit_type: 'add', shape: CanvasUtils.toShape(shape) }
  ))
  if (itemIn(shape.attrs.tool, 'pen', 'eraser', 'arrow', 'line')) {
    // add points if shape created by one click
    if (!(shape instanceof Konva.Line)) throw new TypeError('shape must be Konva.Line')
    const points = shape.attrs.points
    if (points.length === 2) {
      shape.points([points[0] + 1, points[1] + 1, points[0] - 1, points[1]])
    }
    // cache shape
    shape.cache()
  }
  // update height using last shape
  const stage = store.getState().stage
  const newHeight = CanvasUtils.getHeight(canvas, stage.baseHeight)
  if (stage.height < newHeight) {
    store.dispatch(setHeight(newHeight))
    boardEvents.emit('sizeHasChanged')
  }
}
