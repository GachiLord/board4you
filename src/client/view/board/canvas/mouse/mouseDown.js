import store from '../../../store/store'
import { addAction, addItem } from '../../../features/history' 
import { setDrawable, setDraggable, setLastPointerPos } from '../../../features/stage'
import { modifyAttrs, destroy } from '../../../features/select'
import drawAfterUndo from './drawAfterUndo'


export default function(e, props){
    const tool = props.tool
    const color = props.color
    const lineSize = props.lineSize
    const lineType = props.lineType
    const pos = e.target.getStage().getRelativePointerPosition()
    const historyLen = store.getState().history.currentHistory.length


    // del select if drawing and
    if (tool !== 'select') store.dispatch(destroy())

    if (['pen', 'eraser', 'line', 'arrow', 'dashed line'].includes(tool)){
        store.dispatch(setDrawable(true))
        drawAfterUndo()
        
        const type = ['pen', 'eraser', 'dashed line'].includes(tool) ? 'line': tool

        store.dispatch(addItem(
            {   
                tool: tool,
                points: [pos.x, pos.y],
                type: type, 
                color: color,
                shapeId: historyLen,
                pos: {x: 0, y: 0},
                lineSize: lineSize,
                lineType: lineType
            }
        ))
    }
    else if ( ['rect', 'ellipse'].includes(tool) ){
        store.dispatch(setDrawable(true))
        drawAfterUndo()

        store.dispatch(addItem(
            {
                type: tool,
                pos: pos,
                height: 0,
                width: 0,
                color: color,
                shapeId: historyLen,
                lineSize: lineSize,
                lineType: lineType
            }
        ))
    }
    else if (tool === 'select'){
        // draw select if pos isnt on old one
        const selectionIsDraggable = store.getState().select.isDraggable
        if (e.target.attrs.id !== 'selectRect' && !selectionIsDraggable) {
            store.dispatch(setDrawable(true))

            store.dispatch(modifyAttrs(
                {
                    x: pos.x, 
                    y: pos.y,
                    height: 0,
                    width: 0
                }
            ))
        }
    }
    else if (tool === 'move') {
        store.dispatch(setDraggable(true))
    }

    // update last click pos
    setLastPointerPos(pos)
}