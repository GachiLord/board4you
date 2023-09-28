import ISize from "../base/typing/ISize"
import EditManager from "./EditManager"
import Konva from "konva";
import { ICoor } from "../base/typing/ICoor";
import { KonvaEventObject } from "konva/lib/Node";



export type electronData = {base64: string[], path: string, type: string} 

interface electronAPI{
    onMenuButtonClick: (callback: (_: unknown, o: string, d: electronData) => void) => void,
    saveFileAs: (file: string[]) => void,
    saveFile: (file: string[]) => void,
    handleFileChange: () => void,
    handleFileOpen: () => void,
    hadleNewFile: () => void,
    setCanvasSize: (size: ISize) => void,
}

declare global {
    interface Window {
        electronAPI: electronAPI | undefined;
    }
}


export function run(f: (electronAPI: electronAPI) => void, g: undefined|(() => void) = undefined){
    if (window.electronAPI){
        f(window.electronAPI)
    }
    else if(g) g()
}

export function whenDraw(event: KonvaEventObject<MouseEvent>, f: (stage: Konva.Stage, relativePointerPosition: ICoor, drawnShapes: Konva.Layer, temporaryShapes: Konva.Layer, editManager: EditManager) => void){
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

export function getStage(event: KonvaEventObject<MouseEvent>){
    return event.target.getStage()
}

export function itemIn(item: unknown, ...items: unknown[]){
    return items.includes(item)
}

export async function doRequest(path: string, body: object, method: 'POST'|'GET' = 'POST'){
    const response = await fetch(`${location.origin}/${path}`, {
        method: method,
        body: JSON.stringify(body)
    })
    return await response.json()
}
