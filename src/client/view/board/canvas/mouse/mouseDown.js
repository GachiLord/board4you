import { whenDraw, removeTransformers } from "../../../../lib/twiks";
import { setDrawable } from "../../../features/stage";
import { addCurrent } from '../../../features/history'
import {v4 as uuid4} from 'uuid'
import store from "../../../store/store";
import historyUtils from "../../../../lib/HistoryUtils";
import Konva from "konva";



export default function(e, props){
    // start drawing
    store.dispatch(setDrawable(true))
    //shape style vars
    const tool = props.tool
    const color = props.color
    const lineSize = props.lineSize
    const lineType = props.lineType
    const isDraggable = store.getState().stage.isDraggable

    console.log(e.target)
    whenDraw( e, (_, pos, canvas, temporary) => {
        if ('move' !== tool) removeTransformers(canvas)
        // create shape
        let shape = null
        
        // create shape considering the tool
        if (['pen', 'eraser', 'line', 'arrow', 'dashed line'].includes(tool)){
            const type = ['pen', 'eraser', 'dashed line'].includes(tool) ? 'line': tool

            shape = {
                tool: tool,
                points: [pos.x, pos.y],
                type: type,
                color: color,
                shapeId: uuid4(),
                pos: {x: 0, y: 0},
                lineSize: lineSize,
                lineType: lineType
            }

            store.dispatch(addCurrent({type: 'add', shape: shape}))
            canvas.add(historyUtils.toKonvaObject(shape))
        }
        else if ( ['rect', 'ellipse'].includes(tool) ){
            shape = {
                type: tool,
                pos: pos,
                height: 0,
                width: 0,
                color: color,
                shapeId: uuid4(),
                lineSize: lineSize,
                lineType: lineType
            }
            store.dispatch(addCurrent({type: 'add', shape: shape}))
            canvas.add(historyUtils.toKonvaObject(shape))
        }
        else if (tool === 'select'){
            if (e.target.attrs.id !== 'selectRect' && !isDraggable){
                shape = new Konva.Rect({
                    x: pos.x, 
                    y: pos.y,
                    height: 0,
                    width: 0,
                    stroke:'blue',
                    strokeWidth:2,
                    opacity:0.5,
                    dash:[20, 10],
                    id:'selectRect',
                    shadowForStrokeEnabled:false
                })

                temporary.add(shape)
            }
        }
    } )
    
    
}