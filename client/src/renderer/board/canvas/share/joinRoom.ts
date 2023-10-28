import BoardManager from "../../../lib/BoardManager/BoardManager"
import store from "../../../store/store"

interface Props{
    setLoading: (s: boolean) => void
    setRoomExists: (s: boolean) => void
    boardManager: BoardManager,
    roomId: string
}

export default function joinRoom({ setLoading, setRoomExists, boardManager, roomId }: Props){
    const history = store.getState().history
    setLoading(true)
    boardManager.joinRoom(roomId)
        .then(() => {
            boardManager.send('Pull', {
                public_id: boardManager.status.roomId,
                current: history.current.map( edit => edit.id ),
                undone: history.undone.map( edit => edit.id )
            })
            setRoomExists(true)
        })
        // alert if there is no such room 
        .catch((e) => {
            console.error(e)
            setLoading(false)
            setRoomExists(false)
        })    
}