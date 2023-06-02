import store from "../../../store/store"
import { emptySelection } from "../../../features/select"
import { addCurrent } from "../../../features/history"
import CanvasUtils from "../../../lib/CanvasUtils"


export default function(transformer, destroySelection = false){
    const canvas = transformer.parent
    const group = new Konva.Group()
    // add transformer nodes to group
    group.add(...transformer.nodes())
    canvas.add(group)
    // copy group to clipboard
    navigator.clipboard.write([
        new ClipboardItem({
            'image/png': group.toBlob()
        })
    ]);
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
            shapes: children.map( c => CanvasUtils.toShape(c) )
        }))
    }
    else{
        canvas.add(...children)
    }
    group.destroy()
}