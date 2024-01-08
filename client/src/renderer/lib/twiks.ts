import ISize from "../base/typing/ISize"
import EditManager from "./EditManager"
import Konva from "konva";
import { ICoor } from "../base/typing/ICoor";
import { KonvaEventObject } from "konva/lib/Node";
import BoardManager from "./BoardManager/BoardManager";



export type electronData = { base64: string[], path: string, type: string }

interface electronAPI {
  onMenuButtonClick: (callback: (_: unknown, o: string, d: electronData) => void) => void,
  saveFileAs: (file: string[]) => void,
  saveFile: (file: string[]) => void,
  handleFileChange: () => void,
  handleFileOpen: () => void,
  hadleNewFile: () => void,
  setCanvasSize: (size: ISize) => void,
  removeAllListeners: () => void
}

declare global {
  interface Window {
    electronAPI: electronAPI | undefined;
  }
}


export function run(f: (electronAPI: electronAPI) => void, g: undefined | (() => void) = undefined) {
  if (window.electronAPI) {
    f(window.electronAPI)
  }
  else if (g) g()
}

export interface DrawVars {
  stage: Konva.Stage,
  pos: ICoor,
  canvas: Konva.Layer,
  temporary: Konva.Layer,
  editManager: EditManager,
  boardManager: BoardManager
}

export function whenDraw(event: KonvaEventObject<MouseEvent | TouchEvent>, boardManager: BoardManager, f: (drawVars: DrawVars) => void) {
  const stage = getStage(event)
  // do nothing if clicked on stage or draggable shape
  if (event.target.attrs.draggable && event.target !== stage) return
  f({
    stage: stage,
    pos: stage.getRelativePointerPosition(),
    canvas: stage.children[0],
    temporary: stage.children[1],
    editManager: new EditManager(stage.children[0], boardManager),
    boardManager: boardManager
  })
}

export function getStage(event: KonvaEventObject<MouseEvent | TouchEvent>) {
  return event.target.getStage()
}

export function itemIn(item: unknown, ...items: unknown[]) {
  return items.includes(item)
}

export async function doRequest(path: string, body?: object, method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE' = 'GET'): Promise<any> {
  const req = await fetch(`${location.origin}/api/${path}`, {
    method: method,
    body: JSON.stringify(body)
  })
  let json: unknown
  try {
    json = await req.json()
  }
  catch {
    req.text()
      .then(t => {
        json = t
      })
      .catch(() => {
        json = {}
      })
  }

  return new Promise((res, rej) => {
    if (req.ok) res(json)
    else return rej(req)
  })
}
