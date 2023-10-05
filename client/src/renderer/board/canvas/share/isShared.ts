import store from "../../../store/store"

export default function isShared(){
    return store.getState().board.mode === 'shared'
}