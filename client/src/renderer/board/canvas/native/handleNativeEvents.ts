import { tinykeys } from "tinykeys"
import runCommand from "./runCommand"
import { run } from "../../../lib/twiks"
import Konva from "konva"
import BoardManager from "../../../lib/BoardManager/BoardManager"


interface props {
  stage: Konva.Stage,
  boardManager: BoardManager
}


export default function HandleNativeEvents({ stage, boardManager }: props) {
  let keyBindingsSub: () => void = null
  run(electron => {
    electron.onMenuButtonClick((_, o, d) => runCommand(stage, boardManager, o, d))
  },
    () => {
      keyBindingsSub = tinykeys(window, {
        'Control+Shift+L': () => runCommand(stage, boardManager, 'selectSize'),
        'Control+Z': () => runCommand(stage, boardManager, 'undo'),
        'Control+Y': () => runCommand(stage, boardManager, 'redo'),
        'Delete': () => runCommand(stage, boardManager, 'del'),
      })
    })

  return window.electronAPI ? window.electronAPI.removeAllListeners : keyBindingsSub
}
