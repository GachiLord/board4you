import BoardManager from "../../../lib/BoardManager/BoardManager"
import pull from "./pull"

interface Props{
    setLoading: (s: boolean) => void
    setRoomExists: (s: boolean) => void
    boardManager: BoardManager,
    roomId: string
}

export default function joinRoom({ setLoading, setRoomExists, boardManager, roomId }: Props){
    setLoading(true)
    boardManager.joinRoom(roomId)
        .then(() => {
            pull(boardManager)
            setRoomExists(true)
        })
        // alert if there is no such room 
        .catch((e) => {
            console.error(e)
            setLoading(false)
            setRoomExists(false)
        })    
}