import store from '../../../store/store'
import { modifyItem } from '../../../features/history' 
import { setStagePos } from '../../../features/stage'
import { modifyAttrs } from '../../../features/select'


export default function(e, props){
    const tool = props.tool
    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();
    const stageState = store.getState().stage;
    const currentHistory = store.getState().history.currentHistory
    const selectAttrs = store.getState().select.attrs


    if (['pen', 'eraser'].includes(tool) && stageState.isDrawable){
        let shapes = currentHistory;
        let lastLine = {...shapes.at(-1)};
        // add point
        lastLine.points = lastLine.points.concat([point.x,
                                                  point.y]);                                      
        // replace last
        store.dispatch(modifyItem({id: shapes.length - 1, item: lastLine}))
    }
    else if (['arrow', 'line'].includes(tool) && stageState.isDrawable){
        let shapes = currentHistory
        let lastLine = {...shapes.at(-1)}

        if (lastLine.points.length > 2) lastLine.points = lastLine.points.slice(0,2)
        lastLine.points = lastLine.points.concat([point.x, point.y])
            
        store.dispatch(modifyItem({id: shapes.length - 1, item: lastLine}))
    }
    else if (['rect', 'ellipse'].includes(tool) && stageState.isDrawable){
        let shapes = currentHistory
        let rect = {...shapes.at(-1)}
        rect.width = point.x - rect.pos.x
        rect.height = point.y - rect.pos.y

        store.dispatch(modifyItem({id: shapes.length - 1, item: rect}))
    }
    else if (tool === 'select' && stageState.isDrawable){
        let selectRect = {...selectAttrs}
        selectRect.width = point.x - selectRect.x
        selectRect.height = point.y - selectRect.y

        store.dispatch(modifyAttrs(selectRect))          
    }
    else if (tool === 'move' && stageState.isDraggable){
        const lastPos = this.state.stagePos
        const lastPointerPos = this.state.lastPointerPos
        let newPos = {x: 0,y: 0}

        newPos.y += lastPos.y + (point.y - lastPointerPos.y)
        newPos.x += 0
        if (newPos.y >= 0) newPos.y = 0
            
        store.dispatch(setStagePos(newPos))
        //if ( (Math.abs(newPos.y) - this.state.height) >= 0 ) this.increaseHeight()
    }
}