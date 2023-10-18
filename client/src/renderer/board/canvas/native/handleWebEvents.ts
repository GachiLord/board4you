import Konva from "konva"
import runCommand from "./runCommand"
import BoardManager from "../../../lib/BoardManager/BoardManager"

interface props{
    stage: Konva.Stage,
    boardManager: BoardManager
}

export default function handleWebEvents({ stage, boardManager }: props){
    // paste
    const handlePaste = (e: ClipboardEvent) => {
        runCommand(stage, boardManager, 'paste', e)
    }
    window.addEventListener('paste', handlePaste)
    // copy
    const handleCopy = (e: ClipboardEvent) => {
        runCommand(stage, boardManager, 'copy', e)
    }
    window.addEventListener('copy', handleCopy)
    // cut
    const handleCut = (e: ClipboardEvent) => {
        runCommand(stage, boardManager, 'cut', e)
    }
    window.addEventListener('cut', handleCut)
    // remove subs func
    return () => {
        window.removeEventListener('paste', handlePaste)
        window.removeEventListener('copy', handleCopy)
        window.removeEventListener('cut', handleCut)
    }
}