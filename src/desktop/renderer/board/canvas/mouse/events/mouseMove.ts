import store from "../../../../store/store";
import createDividingLine from "../func/createDividingLine";
import { itemIn, whenDraw } from "../../../../lib/twiks";
import { IDrawerProps } from "../../Drawer";
import { KonvaEventObject } from "konva/lib/Node";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { Ellipse } from "konva/lib/shapes/Ellipse";
import { Arrow } from "konva/lib/shapes/Arrow";


export default function(e: KonvaEventObject<MouseEvent>, props: IDrawerProps){
    const tool = props.tool
    const isDrawable = store.getState().stage.isDrawable

    whenDraw( e, (stage, pos, canvas, temporary) => {
        // update dividing lines if neccesary
        if (tool === 'move') createDividingLine(stage.children[2])

        // handle tools usage
        if (itemIn(tool, 'pen', 'eraser') && isDrawable){
            const target = e.target
            const lastline: unknown = canvas.children.at(-1)
            // validate lastLine
            if (!(lastline instanceof Line)) throw new Error('last created element must be a Line')
            // add ref to eraser line if pointer is on shape
            if (target !== stage && tool === 'eraser'){
                target.attrs.connected.add(lastline.attrs.shapeId)
            }
            // add points
            lastline.points(lastline.attrs.points.concat([pos.x, pos.y]))
        }
        
        else if (itemIn(tool, 'arrow', 'line') && isDrawable){
            const lastLine: unknown = canvas.children.at(-1)
            // validate
            if (!(lastLine instanceof Line || lastLine instanceof Arrow)) throw new Error('last created element must be a Line or an Arrow')
            // add points
            if (lastLine.attrs.points.length > 2) lastLine.points(lastLine.attrs.points.slice(0,2))
            lastLine.points(lastLine.attrs.points.concat([pos.x, pos.y]))
        }
        else if (tool === 'rect' && isDrawable){
            const shape: unknown = canvas.children.at(-1)
            // validate
            if (!(shape instanceof Rect)) throw new Error('last created element must be a Rect')
            // update
            shape.setAttrs({
                width: pos.x - shape.attrs.x,
                height: pos.y - shape.attrs.y
            })
        }
        else if (tool === 'ellipse' && isDrawable){
            const shape: unknown = canvas.children.at(-1)
            // validate
            if (!(shape instanceof Ellipse)) throw new Error('last created element must be an Ellipse')
            // update
            shape.setAttrs({
                radiusX: Math.abs(pos.x - shape.attrs.x),
                radiusY: Math.abs(pos.y - shape.attrs.y)
            })
        }
        else if (tool === 'select' && isDrawable && temporary.children[0]){
            const shape: unknown = temporary.children[0]
            // validate
            if (!(shape instanceof Rect)) throw new Error('last created element must be a Rect')
            // update
            shape.setAttrs({
                width: pos.x - shape.attrs.x,
                height: pos.y - shape.attrs.y
            })
        }
    } )
}