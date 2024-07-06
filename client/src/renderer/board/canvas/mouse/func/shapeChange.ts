import CanvasUtils from "../../../../lib/CanvasUtils";
import store from "../../../../store/store";
import { addCurrent, emptyUndone } from "../../../../features/history";
import { setSelection } from "../../../../features/select";
import Konva from "konva";
import { itemIn, run } from "../../../../lib/twiks";
import { v4 } from "uuid";
import { Edit } from "../../../../lib/EditManager";
import BoardManager from "../../../../lib/BoardManager/BoardManager";
import { convertToEnum } from "../../share/convert";
import { EmptyActionType } from "../../../../lib/protocol/protocol_bg";
import { Shape } from "../../../../lib/protocol/protocol";



export default function(transformer: Konva.Transformer, boardManager: BoardManager) {
  // empty undone
  if (store.getState().history.undone.length !== 0) store.dispatch(emptyUndone())

  transformer.on('dragstart transformstart', () => {
    changeHandler(transformer, boardManager)
  })
}


async function changeHandler(transformer: Konva.Transformer, boardManager: BoardManager) {
  // boardmanager vars
  const share = (edit: Edit) => {
    const state = store.getState()
    const shared = itemIn(state.board.mode, 'coop', 'author')

    if (shared) {
      boardManager.send('Empty', {
        action_type: EmptyActionType.Undone,
        free() { }
      })
      boardManager.send('Push', {
        data: [convertToEnum(edit)],
        silent: false
      })
    }
  }
  // transform
  const shapes = transformer.nodes()
  const initial: Shape[] = shapes.map(shape => {
    if (shape instanceof Konva.Shape) {
      return CanvasUtils.toShape(shape, true)
    }
  })
  const current: Shape[] = []

  // add current attrs
  transformer.on('dragend transformend', () => {
    transformer.off('dragend transformend')
    // update selection
    store.dispatch(setSelection(shapes.map(s => {
      if (s instanceof Konva.Shape) {
        return CanvasUtils.toShape(s, true)
      }
    })))

    // add mods
    shapes.forEach(shape => {
      if (shape instanceof Konva.Shape) {
        current.push(CanvasUtils.toShape(shape, true))
      }
    })

    // add changes in history
    // @ts-ignore
    const edit: Edit = {
      id: v4(),
      initial: initial,
      current: current,
    }
    const editToShare = {
      id: edit.id,
      initial: initial.map(shape => CanvasUtils.toNonSerializableShape(shape)),
      current: current.map(shape => CanvasUtils.toNonSerializableShape(shape)),
      free() { }
    }
    store.dispatch(addCurrent(edit))
    // send changes
    share(editToShare)
    // hadnle file change
    run(api => {
      api.handleFileChange()
    })
  })
}
