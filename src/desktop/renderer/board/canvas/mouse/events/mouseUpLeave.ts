import CanvasUtils from "../../../../lib/CanvasUtils";
import { itemIn, run, whenDraw } from "../../../../lib/twiks";
import { setDrawable } from "../../../../features/stage";
import { addCurrent } from "../../../../features/history";
import store from "../../../../store/store";
import Konva from "konva";
import Selection from "../../../../lib/Selection";
import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { Ellipse } from "konva/lib/shapes/Ellipse";
import { IRect } from "konva/lib/types";
import { Arrow } from "konva/lib/shapes/Arrow";
import { setCursor } from "../func/cursor";


export default function(e: KonvaEventObject<MouseEvent>, props: IDrawerProps){
    const isDrawing = store.getState().stage.isDrawable
    const tool = props.tool

    whenDraw( e, (stage, _, canvas, temporary) => {
        const isMouseLeave = e.type === 'mouseleave'

        if (isMouseLeave) setCursor(stage)
        run( api => {
            if (!itemIn(tool, 'move', 'select') && !isMouseLeave) api.handleFileChange()
        } )

        if (itemIn(tool, 'pen', 'eraser', 'arrow', 'line') && isDrawing){
            const lastLine: unknown = canvas.children.at(-1)
            // validate lastLine
            if (!(lastLine instanceof Line || lastLine instanceof Arrow)) throw new Error('last created element must be a Line or an Arrow')
            // save
            const points = lastLine.attrs.points
            
            if (points.length === 2){
                lastLine.points([ points[0] + 1, points[1] + 1, points[0] - 1, points[1] ])
            }
            // cache the line to improve perfomance
            lastLine.cache()
            // add line to history
            store.dispatch(addCurrent({type: 'add', shape: CanvasUtils.toShape(lastLine)}))
        }
        else if (itemIn(tool, 'rect', 'ellipse') && isDrawing){
            const lastShape: unknown = canvas.children.at(-1)
            // validate lastLine
            if (!(lastShape instanceof Rect || lastShape instanceof Ellipse)) throw new Error('last created element must be an Ellipse or Rect')
            // save
            store.dispatch(addCurrent({type: 'add', shape: CanvasUtils.toShape(lastShape)}))
        }
        else if (tool === 'select' && isDrawing && temporary.children[0]){
            const shapes = canvas.children
            const box = temporary.children[0]
            // validate
            if (!(box instanceof Konva.Rect)) throw new Error(`last created temporary shape must be a Rect`)
            const clientRect: IRect = box.getClientRect()
    
            // offset negative wifth and height
            if (clientRect.width < 0){
                clientRect.x += box.width()
                clientRect.width = Math.abs(clientRect.width)
            }
            if (clientRect.height < 0){
                clientRect.y += clientRect.height
                clientRect.height = Math.abs(clientRect.height)
            }
            
            const selected: Konva.Shape[] = []
            let resizable: boolean = null
            // find shapes which have interception with clientRect
            shapes.forEach( shape => {
                if (Konva.Util.haveIntersection(clientRect, shape.getClientRect())){
                    resizable = shape.attrs.connected.size === 0 && resizable !== false

                    if (shape instanceof Konva.Shape) selected.push(shape)
                    shapes.forEach(i => {
                        if (shape.attrs.connected.has(i.attrs.shapeId) && i instanceof Konva.Shape){
                            selected.push(i)
                        }
                    })
                }
            } )
            // create transformer for them
            if (selected.length !== 0){
                Selection.create(selected)
            }
            box.destroy()
        }
    } )


    store.dispatch(setDrawable(false))
}