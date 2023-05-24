import { whenDraw, removeTransformers } from "../../../../lib/twiks";
import { setDrawable } from "../../../features/stage";
import { addCurrent } from '../../../features/history'
import {v4 as uuid4} from 'uuid'
import store from "../../../store/store";
import CanvasUtils from "../../../../lib/CanvasUtils";
import Konva from "konva";
import primaryColor from '../../../base/primaryColor'



export default function(e, props){
    // start drawing
    store.dispatch(setDrawable(true))
    //shape style vars
    const tool = props.tool
    const color = props.color
    const lineSize = props.lineSize
    const lineType = props.lineType
    const isDraggable = store.getState().stage.isDraggable


    whenDraw( e, (stage, pos, canvas, temporary) => {
        if (tool !== 'move') removeTransformers(canvas)
        // create shape
        let shape = null
        
        // create shape considering the tool
        if (['pen', 'eraser', 'line', 'arrow', 'dashed line'].includes(tool)){
            const type = ['pen', 'eraser', 'dashed line'].includes(tool) ? 'line': tool

            shape = {
                tool: tool,
                points: [pos.x, pos.y],
                tool: type,
                color: color,
                shapeId: uuid4(),
                x: 0,
                y: 0,
                lineSize: lineSize,
                lineType: lineType
            }

            canvas.add(CanvasUtils.toKonvaObject(shape))
        }
        else if ( ['rect', 'ellipse'].includes(tool) ){
            shape = {
                tool: tool,
                pos: pos,
                height: 0,
                width: 0,
                color: color,
                shapeId: uuid4(),
                lineSize: lineSize,
                lineType: lineType
            }
            store.dispatch(addCurrent({type: 'add', shape: shape}))
            canvas.add(CanvasUtils.toKonvaObject(shape))
        }
        else if (tool === 'select' && !isDraggable && e.target.attrs.id !== 'selectRect'){
            // select multiple shapes
            if ( e.target === stage ){
                shape = new Konva.Rect({
                    x: pos.x, 
                    y: pos.y,
                    height: 0,
                    width: 0,
                    stroke: primaryColor,
                    strokeWidth:2,
                    opacity:0.8,
                    dash:[5, 5],
                    id:'selectRect',
                    shadowForStrokeEnabled:false,
                })

                temporary.add(shape)
            }
            // select only clicked shape
            else {
                const connected = []
                let resizable = null
                // find shapes which have interception with clientRect
                canvas.children.forEach(s => {
                    resizable = e.target.attrs.connected.size === 0
                    if (e.target.attrs.connected.has(s.attrs.shapeId)) connected.push(s)
                })
                // create transformer for them
                const tr = new Konva.Transformer({
                    resizeEnabled: resizable
                })
                canvas.add(tr)
                e.target.setAttr('draggable', true)
                tr.nodes([e.target, ...connected])
            }
        }
    } )
    
    
}