import store from "../../../store/store"
import { modifyAction } from '../../../features/history'
import { modifyAttrs } from "../../../features/select"


export default function(e){
    const select = store.getState().select
    const actions = store.getState().history.historyActions
    if (!select.isDraggable) return

    const pos = e.target._lastPos
    let lastAction = {...actions.at(-1)}
    let attrs = {...select.attrs}
    attrs.x = pos.x + Math.abs(attrs.x)
    attrs.y = pos.y + Math.abs(attrs.y)
    lastAction.newPos = pos

    store.dispatch(modifyAction(
        {id: actions.length - 1, action: lastAction}
    ))
    store.dispatch(modifyAttrs(attrs))
}