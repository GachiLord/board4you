import CanvasUtils from "../../../../../lib/CanvasUtils";
import store from "../../../../store/store";
import { addCurrent, emptyUndone } from "../../../../features/history";
import { setSelection } from "../../../../features/select";



export default function(transformer){
    // empty undone
    if (store.getState().history.undone.length !== 0) store.dispatch(emptyUndone())

    transformer.on('dragstart transformstart', () => {
        changeHandler(transformer)
    })
}


async function changeHandler(transformer){
    const shapes = transformer.nodes()
    const initial = shapes.map( shape => CanvasUtils.retrivePossibleFields(shape.attrs) )
    const current = []

    // add current attrs
    transformer.on('dragend transformend', () => {
        transformer.off('dragend transformend')
        // update selection
        store.dispatch(setSelection(shapes.map( s => CanvasUtils.toShape(s) )))

        // add mods
        shapes.forEach(shape => {
            current.push(CanvasUtils.retrivePossibleFields(shape.attrs))
        })

        // add changes in history
        store.dispatch(addCurrent({
            type: 'modify',
            initial: initial,
            current: current
        }))
    })
}