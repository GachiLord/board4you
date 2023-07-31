import LineFactory from "../../../../../src/desktop/renderer/lib/NodeFactories/LineFactory"
import EditManager from "../../../../../src/desktop/renderer/lib/EditManager"
import Konva from "konva"
import store from "../../../../../src/desktop/renderer/store/store"
import CanvasUtils from "../../../../../src/desktop/renderer/lib/CanvasUtils"
import { Edit } from "../../../../../src/desktop/renderer/lib/EditManager"
import { addCurrent } from "../../../../../src/desktop/renderer/features/history"

export default function getTestCase(shapeAmount: number){
    const factory = new LineFactory()
    const layer = new Konva.Layer()
    const editManager = new EditManager(layer)

    factory.create(shapeAmount).forEach( node => {
        const edit: Edit = {
            type: 'add',
            shape: CanvasUtils.toShape(node)
        }
        editManager.applyEdit(edit)
        store.dispatch(addCurrent(edit))
    } )
    
    
    return {
        layer: layer,
        manager: editManager
    }
}