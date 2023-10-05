import store from "../store/store";

export default function isAuthor(roomId?: string){
    return store.getState().rooms[roomId] != undefined  || roomId === undefined
}