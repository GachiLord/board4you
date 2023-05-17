import CanvasUtils from "../../../../lib/CanvasUtils"
import store from '../../../store/store'
import { setDrawable, setDraggable } from '../../../features/stage'
import { modifyItem } from '../../../features/history'
import { modifySelection, destroy } from "../../../features/select"


export default function(e, props){
    // stop drawing if we are not on canvas
    // stop drawing    
    const isDrawing = store.getState().stage.isDrawable
    const tool = props.tool
    const stage = e.target.getStage()


    if ('pen'=== tool){
        let shapes = store.getState().history.currentHistory
        let lastEl = {...shapes.at(-1)}
        let points = lastEl.points
        
        if (points.length === 2){
            lastEl.points = points.concat([ points[0] + 1, points[1] + 1, points[0] - 1, points[1] ])
            store.dispatch(modifyItem({id: shapes.length - 1, item: lastEl}))
        }
    }
    else if (tool === 'select' && isDrawing){
        let shapes = stage.getChildren()[0].children
        let box = {...store.getState().select.attrs}

        // offset negative wifth and height
        if (box.width < 0) {
            box.x += box.width
            box.width = Math.abs(box.width)
        }
        if (box.height < 0){
            box.y += box.height
            box.height = Math.abs(box.height)
        }

        let selected = [];
        for (const shape of shapes){
            const shapeType = shape.attrs.tool
            if (shapeType === 'line' || shapeType === 'arrow' || shapeType === 'pen'){
                if (CanvasUtils.hasInterceptionWithLine(box, shape)){
                    selected.push(CanvasUtils.convertToShape(shape.attrs))
                }
            }
            else{
                if (Konva.Util.haveIntersection(box, CanvasUtils.getClientRect(shape))){
                    selected.push(CanvasUtils.convertToShape(shape.attrs))
                }
            }
        }

        store.dispatch(modifySelection(selected))
        if (selected.length === 0) store.dispatch(destroy())
    }
    else if (tool === 'move') store.dispatch(setDraggable(false))

    store.dispatch(setDrawable(false))
}