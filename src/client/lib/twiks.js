import EditManager from "./EditManager"


export function run(f = (electronAPI) => {}, g = () => console.warn('electronApi is not found')){
    if (window.electronAPI){
        f(window.electronAPI)
    }
    else g()
}

export function whenDraw(event, f = (stage, relativePointerPosition, drawnShapes, temporaryShapes, editManager) => {}){
    const stage = getStage(event)
    // do nothing if clicked on stage or draggable shape
    if (event.target.attrs.draggable && event.target !== stage) return
    f(stage,
      stage.getRelativePointerPosition(),
      stage.children[0],
      stage.children[1],
      new EditManager(stage.children[0])
    )
}

export function getStage(event){
    return event.target.getStage()
}

export function emptyLayer(layer){
    layer.children.forEach(s => {
        s.destroy()
    })
}
