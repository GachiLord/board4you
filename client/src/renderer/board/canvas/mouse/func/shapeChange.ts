import CanvasUtils from "../../../../lib/CanvasUtils";
import store from "../../../../store/store";
import { addCurrent, emptyUndone } from "../../../../features/history";
import { setSelection } from "../../../../features/select";
import Konva from "konva";
import IShape from "../../../../base/typing/IShape";
import { run } from "../../../../lib/twiks";



export default function(transformer: Konva.Transformer){
    // empty undone
    if (store.getState().history.undone.length !== 0) store.dispatch(emptyUndone())

    transformer.on('dragstart transformstart', () => {
        changeHandler(transformer)
    })
}


async function changeHandler(transformer: Konva.Transformer){
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
        store.dispatch(addCurrent({
            type: 'modify',
            initial: initial,
            current: current
        }))
        // hadnle file change
        run( api => {
            api.handleFileChange()
        } )
    })
}