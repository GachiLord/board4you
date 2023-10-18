import BoardManager from "../../../lib/BoardManager/BoardManager"

interface Props{
    setLoading: (s: boolean) => void
    setRoomExists: (s: boolean) => void
    boardManager: BoardManager,
    roomId: string
}

export default function joinRoom({ setLoading, setRoomExists, boardManager, roomId }: Props){
    setLoading(true)
    boardManager.connect().then( () => {
        boardManager.joinRoom(roomId)
            .then(() => {
                boardManager.send('Pull', {
                    public_id: boardManager.status.roomId,
                    current: [],
                    undone: []
                })
            })
            // alert if there is no such room 
            .catch((e) => {
                console.error(e)
                setLoading(false)
                setRoomExists(false)
            })
    } )        
}