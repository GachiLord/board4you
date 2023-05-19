import { setDrawable } from "../../../features/stage";
import store from "../../../store/store";

export default function(){
    store.dispatch(setDrawable(false))
}