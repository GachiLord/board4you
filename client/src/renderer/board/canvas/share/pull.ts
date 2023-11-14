import BoardManager from "../../../lib/BoardManager/BoardManager";
import store from "../../../store/store";

export default function pull(boardManager: BoardManager){
    const history = store.getState().history
    boardManager.send('Pull', {
        public_id: boardManager.status.roomId,
        current: history.current.map( edit => edit.id ),
        undone: history.undone.map( edit => edit.id )
    })
}