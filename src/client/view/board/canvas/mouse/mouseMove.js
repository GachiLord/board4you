import { whenDraw } from "../../../../lib/twiks";
import store from "../../../store/store";

export default function(e, props){
    const tool = props.tool
    const isDrawable = store.getState().stage.isDrawable

    whenDraw( e, (_, pos, canvas, temporary) => {
        if (['pen', 'eraser'].includes(tool) && isDrawable){
            const lastline = canvas.children.at(-1)
            // add points
            lastline.points(lastline.attrs.points.concat([pos.x, pos.y]))
        }
        else if (['arrow', 'line'].includes(tool) && isDrawable){
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