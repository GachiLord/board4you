import Konva from "konva";
import store from "../store/store";
import { setSelection, emptySelection } from "../features/select";
import shapeChange from "../board/canvas/mouse/func/shapeChange";
import CanvasUtils from "./CanvasUtils";
import BoardManager from "./BoardManager/BoardManager";


export default class Selection{
    static create(shapes: Konva.Shape[], boardManager: BoardManager){
        if (shapes.length !== 0){
            const canvas = shapes[0].parent
            let transformable: boolean = null
            // make them draggable
            shapes.forEach( shape => {
                shape.setAttr('draggable', true)
                transformable = CanvasUtils.findFew(canvas, 'shapeId', shape.attrs.connected).length === 0
                && transformable !== false
            } )
            const tr = new Konva.Transformer({
                resizeEnabled: transformable,
                rotateEnabled: transformable
            });
            canvas.add(tr);
            tr.nodes(shapes)
            // add listener for transform and drag
            shapeChange(tr, boardManager)
            // add selected to selection
            store.dispatch(setSelection(shapes.map( s => CanvasUtils.toShape(s) )))
        }
        else throw new Error('Invalid value. Shapes must have length greater than 0')
    }

    static destroy(layer: Konva.Layer){
        layer.find('Transformer').forEach(t => {
            if (t instanceof Konva.Transformer){
                // empty selection
                store.dispatch(emptySelection())
                // detach nodes
                t.nodes().forEach( s => {
                    s.setAttr('draggable', false)
                } )
                t.detach()
                t.destroy()
            }
        })
    }
}