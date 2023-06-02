import { run } from "./twiks"
import getCanvasSize from "../../common/getCanvasSize"
import { setBaseHeight, setWidth } from '../features/stage'
import store from "../store/store"


export default function(size = getCanvasSize()){
    run( api => {
        api.setCanvasSize(size)
    })
    store.dispatch(setBaseHeight(size.height))
    store.dispatch(setWidth(size.width))
    localStorage.setItem('CanvasSize', JSON.stringify(size))
}