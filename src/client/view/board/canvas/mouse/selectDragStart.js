import { addAction } from "../../../features/history"
import store from "../../../store/store"
import { setDraggble } from '../../../features/select'
import drawAfterUndo from "./drawAfterUndo"


export default function(){
    const select = store.getState().select
    const stage = store.getState().stage

    if (select.selection.length > 0) {
        drawAfterUndo()
        setDraggble(true)
        
        const selectRect = {...select.attrs}
        store.dispatch(addAction({
            action: 'move',
            shapes: select.selection,
            oldPos: {
                        x: selectRect.x + stage.stagePos.x,
                        y: selectRect.y + stage.stagePos.y
                    },
            newPos: 
                    {
                        x: selectRect.x + stage.stagePos.x,
                        y: selectRect.y + stage.stagePos.y
                    },
        }))
    }
}