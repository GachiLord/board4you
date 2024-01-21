import LineFactory from "../../../../src/renderer/lib/NodeFactories/LineFactory"
import EditManager from "../../../../src/renderer/lib/EditManager"
import Konva from "konva"
import store from "../../../../src/renderer/store/store"
import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils"
import { Edit } from "../../../../src/renderer/lib/EditManager"
import { addCurrent } from "../../../../src/renderer/features/history"
import { v4 as uuid } from 'uuid'
import BoardManager from "../../../../src/renderer/lib/BoardManager/BoardManager"

export default function getTestCase(shapeAmount: number) {
  const factory = new LineFactory()
  const layer = new Konva.Layer()
  const editManager = new EditManager(layer, new BoardManager())

  factory.create(shapeAmount).forEach(node => {
    const edit: Edit = {
      id: uuid(),
      edit_type: 'add',
      shape: CanvasUtils.toShape(node)
    }
    editManager.applyEdit(edit)
    store.dispatch(addCurrent(edit))
  })


  return {
    layer: layer,
    manager: editManager
  }
}
