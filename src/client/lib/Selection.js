import Konva from "konva";
import store from "../view/store/store";
import { setSelection, emptySelection } from "../view/features/select";
import shapeChange from "../view/board/canvas/mouse/shapeChange";
import CanvasUtils from "./CanvasUtils";



export default class Selection{
    static create(shapes){
        if (shapes.length !== 0){
            const canvas = shapes[0].parent
            let transformable = null
            // make them draggable
            shapes.forEach( shape => {
                shape.setAttr('draggable', true)
                transformable = shape.attrs.connected.size === 0 && transformable !== false
            } )
            const tr = new Konva.Transformer({
                resizeEnabled: transformable,
                rotateEnabled: transformable
            });
            canvas.add(tr);
            tr.nodes(shapes)
            // add listener for transform and drag
            shapeChange(tr)
            // add selected to selection
            store.dispatch(setSelection(shapes.map( s => CanvasUtils.toShape(s) )))
        }
        else throw new Error('Invalid value. Shapes must have length greater than 0')
    }

    static destroy(layer){
        layer.find('Transformer').forEach(t => {
            // empty selection
            store.dispatch(emptySelection())
            // detach nodes
            t.nodes().forEach( s => {
                s.setAttr('draggable', false)
            } )
            t.detach()
            t.destroy()
        })
    }
}