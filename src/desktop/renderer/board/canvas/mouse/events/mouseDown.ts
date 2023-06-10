import { itemIn, whenDraw } from "../../../../lib/twiks";
import { setDrawable } from "../../../../features/stage";
import { emptyUndone } from '../../../../features/history'
import {v4 as uuid4} from 'uuid'
import store from "../../../../store/store";
import CanvasUtils from "../../../../lib/CanvasUtils";
import Konva from "konva";
import primaryColor from '../../../../base/style/primaryColor'
import Selection from "../../../../lib/Selection";
import IShape from "../../../../base/typing/IShape";
import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";



export default function(e: KonvaEventObject<MouseEvent>, props: IDrawerProps){
    // start drawing
    store.dispatch(setDrawable(true))
    //shape style vars
    const tool = props.tool
    const color = props.color
    const lineSize = props.lineSize
    const lineType = props.lineType
    const isDraggable = store.getState().stage.isDraggable


    whenDraw( e, (stage, pos, canvas, temporary) => {
        const undone = store.getState().history.undone.at(-1)
        // empty undone if it exists and tool is not select
        if (undone && tool !== 'select' && tool !== 'move') store.dispatch(emptyUndone())
        Selection.destroy(canvas)
        // create shape
        let shape: IShape = null
        
        // create shape considering the tool
        if (itemIn(tool, 'pen', 'eraser', 'line', 'arrow')){

            shape = {
                tool: tool,
                points: [pos.x, pos.y],
                type: tool === 'arrow' ? 'arrow' : 'line',
                color: tool !== 'eraser' ? color: '#ffffff',
                shapeId: uuid4(),
                x: 0,
                y: 0,
                lineSize: lineSize,
                lineType: lineType,
                connected: []
            }

            canvas.add(CanvasUtils.toKonvaObject(shape))
        }
        else if (tool === 'rect'){
            shape = {
                tool: tool,
                type: tool,
                x: pos.x,
                y: pos.y,
                height: 0,
                width: 0,
                color: color,
                shapeId: uuid4(),
                lineSize: lineSize,
                lineType: lineType,
            }
            canvas.add(CanvasUtils.toKonvaObject(shape))
        }
        else if (tool === 'ellipse'){
            shape = {
                tool: tool,
                type: tool,
                x: pos.x,
                y: pos.y,
                radiusY: 0,
                radiusX: 0,
                color: color,
                shapeId: uuid4(),
                lineSize: lineSize,
                lineType: lineType,
            }
            canvas.add(CanvasUtils.toKonvaObject(shape))
        }
        else if (tool === 'select' && !isDraggable && e.target.attrs.id !== 'selectRect'){
            // select multiple shapes
            if ( e.target === stage ){
                const shape = new Konva.Rect({
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
                const connected: Konva.Shape[] = []
                // find shapes which have interception with clientRect
                canvas.children.forEach(s => {
                    if (e.target.attrs.connected.has(s.attrs.shapeId) && s instanceof Konva.Shape) connected.push(s)
                })
                // create transformer for them
                if (e.target instanceof Konva.Shape) Selection.create([e.target, ...connected])
            }
        }
    } )
    
    
}