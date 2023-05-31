import { run } from "../lib/twiks"
import getCanvasSize from "./CommonGetCanvasSize"
import { setBaseHeight, setWidth } from '../view/features/stage'
import store from "../view/store/store"


export default function(size = getCanvasSize()){
    run( api => {
        api.setCanvasSize(size)
    })
    store.dispatch(setBaseHeight(size.height))
    store.dispatch(setWidth(size.width))
    localStorage.setItem('CanvasSize', JSON.stringify(size))
}