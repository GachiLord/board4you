import { run } from "../lib/twiks"
import getCanvasSize from "./CommonGetCanvasSize"

export default function(size = getCanvasSize()){
    run( api => {
        api.setCanvasSize(size)
    })
    localStorage.setItem('CanvasSize', JSON.stringify(size))
}