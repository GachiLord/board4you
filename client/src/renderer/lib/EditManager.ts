import CanvasUtils from "./CanvasUtils";
import store from "../store/store";
import { emptyUndone, undo, redo } from "../features/history";
import Konva from "konva";
import { itemIn } from "./twiks";
import BoardManager from "./BoardManager/BoardManager";
import { ActionType, Add, Modify, Remove, Shape } from "./protocol/protocol";
import { Tool } from "./protocol/protocol_bg";



export type Edit = Add | Remove | Modify


export default class EditManager {
  layer: Konva.Layer
  boardManager: BoardManager

  constructor(layer: Konva.Layer, boardManager: BoardManager) {
    this.layer = layer
    this.boardManager = boardManager
  }

  static getHistoryImprint() {
    const history = store.getState().history
    return {
      current: history.current.map(e => e.id),
      undone: history.undone.map(e => e.id)
    }
  }

  static getEditFromShape(shape: Shape): Edit {
    return {
      id: shape.shape_id,
      shape: shape,
      free: () => { },
    }
  }

  static getEditFromKonvaObject(obj: Konva.Shape) {
    return EditManager.getEditFromShape(CanvasUtils.toShape(obj))
  }

  #share(action_type: ActionType, action_id: string) {
    if (!this.boardManager.status.connected) return

    this.boardManager.send(
      'UndoRedo',
      {
        action_type,
        action_id,
        free: () => { }
      }
    )
  }

  rebase() {
    store.dispatch(emptyUndone())
  }

  undo(edit_id?: string, silent?: boolean) {
    const current = store.getState().history.current
    const lastEdit = edit_id ? current.findLast(v => v.id === edit_id) : current.at(-1)
    if (!lastEdit) {
      console.warn("attempt to undo non-existent shape with id: ", edit_id)
      return
    }

    this.cancelEdit(lastEdit)
    store.dispatch(undo(edit_id))
    // send msg
    if (!silent) this.#share(ActionType.Undo, lastEdit.id)
  }

  redo(edit_id?: string, silent?: boolean) {
    const undone = store.getState().history.undone
    const lastEdit = edit_id ? undone.findLast(v => v.id === edit_id) : undone.at(-1)
    if (!lastEdit) {
      console.warn("attempt to redo non-existent shape with id: ", edit_id)
      return
    }

    this.applyEdit(lastEdit)
    store.dispatch(redo())
    // send msg
    if (!silent) this.#share(ActionType.Redo, lastEdit.id)
  }

  applyEdit(edit: Edit) {
    const keys = Object.keys(edit)
    let t = 0
    if (keys.includes('shape')) t = 0
    if (keys.includes('shapes')) t = 1
    if (keys.includes('current')) t = 2

    switch (t) {
      case 0: {
        const e = edit as Add;
        const shapeToAdd = CanvasUtils.toKonvaObject(e.shape)
        if (!itemIn(e.shape.tool, Tool.ImgTool, Tool.RectTool)) shapeToAdd.cache()
        this.layer.add(shapeToAdd)
        break
      }
      case 1: {
        const e = edit as Remove;
        e.shapes.forEach(shape => {
          CanvasUtils.findOne(this.layer, { shape_id: shape.shape_id }).destroy()
        })
        break

      }
      case 2:
        const e = edit as Modify;
        e.current.forEach((attrs) => {
          const shapeToModify = CanvasUtils.findOne(this.layer, { shape_id: attrs.shape_id })
          shapeToModify.setAttrs({
            ...attrs,
            x: attrs.x,
            y: attrs.y,
            radiusX: attrs.radius_x,
            radiusY: attrs.radius_y,
            rotation: attrs.rotation,
            scaleX: attrs.scale_x,
            scaleY: attrs.scale_y,
            skewX: attrs.skew_x,
            skewY: attrs.skew_y,
            connected: new Set(attrs.connected)
          })
        })
        break
    }
  }

  cancelEdit(edit: Edit) {
    const keys = Object.keys(edit)
    let t = 0
    if (keys.includes('shape')) t = 0
    if (keys.includes('shapes')) t = 1
    if (keys.includes('current')) t = 2
    console.log(edit, t)

    switch (t) {
      case 0: {
        const e = edit as Add;
        const shapeToRemove = CanvasUtils.findOne(this.layer, { shape_id: e.shape.shape_id })
        shapeToRemove.destroy()
        break
      }
      case 1: {
        const e = edit as Remove;
        e.shapes.forEach(shape => {
          const shapeToAdd = CanvasUtils.toKonvaObject(shape)
          shapeToAdd.cache()
          this.layer.add(shapeToAdd)
        })
        break

      }
      case 2: {
        const e = edit as Modify;
        e.initial.forEach((attrs) => {
          const shapeToModify = CanvasUtils.findOne(this.layer, { shape_id: attrs.shape_id })
          shapeToModify.setAttrs({
            ...attrs,
            x: attrs.x,
            y: attrs.y,
            radiusX: attrs.radius_x,
            radiusY: attrs.radius_y,
            rotation: attrs.rotation,
            scaleX: attrs.scale_x,
            scaleY: attrs.scale_y,
            skewX: attrs.skew_x,
            skewY: attrs.skew_y,
            connected: new Set(attrs.connected)
          })
        })
        break
      }
    }
  }
}
