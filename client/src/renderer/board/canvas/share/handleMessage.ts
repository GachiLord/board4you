import EditManager from "../../../lib/EditManager"
import boardEvents from "../../../base/constants/boardEvents"
import handlePush from "./handlePush"
import handlePull from "./handlePull"
import { PushSegmentData } from "../../../lib/BoardManager/typing"
import handlePushStart from "./handlePushStart"
import handlePushUpdate from "./handlePushUpdate"
import handlePushEnd from "./handlePushEnd"
import store from "../../../store/store"
import { emptyCurrent, emptyHistory, emptyUndone } from "../../../features/history"
import setCanvasSize from "../../../lib/setCanvasSize"


interface props{
    editManager: EditManager,
    setLoading: (s: boolean) => void
}


export default function(msg: string, {editManager, setLoading}: props){
    const canvas = editManager.layer
    const parsed = JSON.parse(msg)
    const key = Object.keys(parsed)[0]
    const data = parsed[key]

    switch(key){
        case 'PushData':{
            handlePush(editManager, data.data)
            break
        }
        case 'PullData':
            handlePull(editManager, data)
            setLoading(false)
            break
        case 'PushSegmentData':{
            const segment: PushSegmentData = data
            const t = segment.action_type
            if (t === 'Start') handlePushStart(canvas, JSON.parse(segment.data))
            if (t === 'Update') handlePushUpdate(canvas, JSON.parse(segment.data))
            if (t === 'End') handlePushEnd(canvas, segment.data)
            break
        }
        case 'UndoRedoData':{
            if (data.action_type === 'Undo') editManager.undo(data.action_id, true)
            else editManager.redo(data.action_id, true)
            break
        }
        case 'EmptyData':{
            const t = data.action_type 
            if (t === 'undone') store.dispatch(emptyUndone())
            if (t === 'current') store.dispatch(emptyCurrent())
            if (t === 'history') store.dispatch(emptyHistory())
            break
        }
        case 'SizeData':{
            const size = data.data
            setCanvasSize(size)
            boardEvents.emit('sizeHasChanged', size)
            break
        }
        default:{
            console.log(data)
        }
    }
}    