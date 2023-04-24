import getCanvasSize from "./CommonGetCanvasSize"

export default function(size = getCanvasSize()){
    if (window.electronAPI) {
        window.electronAPI.setCanvasSize(size)
    }
    localStorage.setItem('CanvasSize', JSON.stringify(size))
}