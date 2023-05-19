
export function run(f, g = () => console.warn('electronApi is not found')){
    if (window.electronAPI){
        f(window.electronAPI)
    }
    else g()
}

export function whenDraw(event, f = (stage, relativePointerPosition, drawnShapes, temporaryShapes) => {}){
    const stage = getStage(event)
    // do nothing if clicked on stage or draggable shape
    if (event.target.attrs.draggable && event.target !== stage) return
    f(stage,
      stage.getRelativePointerPosition(),
      stage.children[0],
      stage.children[1]
    )
}

export function getStage(event){
    return event.target.getStage()
}

export function emptyLayer(layer){
    layer.children.forEach(s => {
        s.remove()
    });
}

export function removeTransformers(layer){
    layer.find('Transformer').forEach(t => {
        t.nodes().forEach( s => {
            s.setAttr('draggable', false)
            //s.cache()
        } )
        t.detach()
        t.remove()
    });
}
