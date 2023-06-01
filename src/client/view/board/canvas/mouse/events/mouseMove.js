import { whenDraw } from "../../../../../lib/twiks";
import store from "../../../../store/store";
import createDividingLine from "../func/createDividingLine";
import { itemIn } from "../../../../../lib/twiks";


export default function(e, props){
    const tool = props.tool
    const isDrawable = store.getState().stage.isDrawable

    whenDraw( e, (stage, pos, canvas, temporary) => {
        // update dividing lines if neccesary
        if (tool === 'move') createDividingLine(stage.children[2])

        // handle tools usage
        if (itemIn(tool, 'pen', 'eraser') && isDrawable){
            const target = e.target
            const lastline = canvas.children.at(-1)
            // add ref to eraser line if pointer is on shape
            if (target !== stage && tool === 'eraser'){
                target.attrs.connected.add(lastline.attrs.shapeId)
            }
            // add points
            lastline.points(lastline.attrs.points.concat([pos.x, pos.y]))
        }
        
        else if (itemIn(tool, 'arrow', 'line') && isDrawable){
            let lastLine = canvas.children.at(-1)
    
            if (lastLine.attrs.points.length > 2) lastLine.points(lastLine.attrs.points.slice(0,2))
            lastLine.points(lastLine.attrs.points.concat([pos.x, pos.y]))
        }
        else if (tool === 'rect' && isDrawable){
            let shape = canvas.children.at(-1)

            shape.setAttrs({
                width: pos.x - shape.attrs.x,
                height: pos.y - shape.attrs.y
            })
        }
        else if (tool === 'ellipse' && isDrawable){
            let shape = canvas.children.at(-1)
            shape.setAttrs({
                radiusX: Math.abs(pos.x - shape.attrs.x),
                radiusY: Math.abs(pos.y - shape.attrs.y)
            })
        }
        else if (tool === 'select' && isDrawable && temporary.children[0]){
            let shape = temporary.children[0]

            shape.setAttrs({
                width: pos.x - shape.attrs.x,
                height: pos.y - shape.attrs.y
            })
        }
    } )
}