import CanvasUtils from "../../../../lib/CanvasUtils";
import store from "../../../../store/store";
import { addCurrent, emptyUndone } from "../../../../features/history";
import { setSelection } from "../../../../features/select";
import Konva from "konva";
import IShape from "../../../../base/typing/IShape";
import { run } from "../../../../lib/twiks";
import { v4 } from "uuid";
import { Edit } from "../../../../lib/EditManager";
import BoardManager from "../../../../lib/BoardManager/BoardManager";
import { convertToStrings } from "../../share/convert";



export default function(transformer: Konva.Transformer, boardManager: BoardManager){
    // empty undone
    if (store.getState().history.undone.length !== 0) store.dispatch(emptyUndone())

    transformer.on('dragstart transformstart', () => {
        changeHandler(transformer, boardManager)
    })
}


async function changeHandler(transformer: Konva.Transformer, boardManager: BoardManager){
    // boardmanager vars
    const share = (edit: Edit) => {
        const state = store.getState()
        const shared = state.board.mode === 'shared'
        const public_id = boardManager.status.roomId
        const private_id: undefined|string = state.rooms[public_id]

        if (shared){
            boardManager.send('Push', {
                public_id,
                private_id,
                data: convertToStrings([edit]),
                silent: false
            })
        }
    }
    // transform
    const shapes = transformer.nodes()
    const initial: IShape[] = shapes.map( shape => {
        if (shape instanceof Konva.Shape){
            return CanvasUtils.toShape(shape)
        }
    } )
    const current: IShape[] = []

    // add current attrs
    transformer.on('dragend transformend', () => {
        transformer.off('dragend transformend')
        // update selection
        store.dispatch(setSelection(shapes.map( s => {
            if (s instanceof Konva.Shape){
                return CanvasUtils.toShape(s)
            }
        } )))

        // add mods
        shapes.forEach(shape => {
            if (shape instanceof Konva.Shape){
                current.push(CanvasUtils.toShape(shape))
            }
        })

        // add changes in history
        const edit: Edit = {
            id: v4(),
            type: 'modify',
            initial: initial,
            current: current
        }
        store.dispatch(addCurrent(edit))
        // send changes
        share(edit)
        // hadnle file change
        run( api => {
            api.handleFileChange()
        } )
    })
}