import store from "../../../store/store"
import { emptySelection } from "../../../features/select"
import { addCurrent } from "../../../features/history"
import CanvasUtils from "../../../lib/CanvasUtils"
import Konva from "konva"


export default function(transformer: Konva.Transformer, destroySelection = false){
    const canvas = transformer.parent
    const group = new Konva.Group()
    // add transformer nodes to group
    transformer.nodes().forEach( node => {
        if (node instanceof Konva.Shape) group.add(node)
    } )
    canvas.add(group)
    // copy group to clipboard
    const blob = group.toBlob()
    if (blob instanceof Blob){
        navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ])
    }
    // prevent removing of connected nodes
    transformer.detach()
    transformer.destroy()
    // empty selection and make undraggable
    store.dispatch(emptySelection())
    group.children.forEach( c => c.setAttr('draggable', false) )
    // remove and destroy group, saving or destroying children
    const children = group.children
    group.remove()
    if (destroySelection){
        store.dispatch(addCurrent({
            type: 'remove',
            shapes: children.map( c => {
                if (c instanceof Konva.Shape){
                    return CanvasUtils.toShape(c)
                }
            } )
        }))
    }
    else{
        canvas.add(...children)
    }
    group.destroy()
}