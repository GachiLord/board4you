import renderVisible from "../../image/renderVisible";
import { whenDraw } from "../../../../lib/twiks";


export default function (e){
    whenDraw(e, (_, __, canvas) => {
        renderVisible(canvas)
    })
}