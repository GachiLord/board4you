import {EventEmitter, EventSubscription} from 'fbemitter'
import { ICoor } from '../typing/ICoor'



interface IBoardEventsMap{
    'roomCreated': () => void
    'undo': () => void
    'redo': () => void
    'pageSetted': (pos: ICoor) => void
    'sizeHasChanged': (size: undefined|{ width: number, height: number, baseHeight: number }) => void
    'selectSize': () => void
}

interface IBoardEvents{
    addListener<E extends keyof IBoardEventsMap>(type: E, listener: IBoardEventsMap[E]): EventSubscription;
    once<E extends keyof IBoardEventsMap>(type: E, listener: IBoardEventsMap[E]): EventSubscription;
    emit<E extends keyof IBoardEventsMap>(type: E, ...args: any[]): void;
}

class BoardEvents extends EventEmitter implements IBoardEvents{}


const boardEvents: IBoardEvents = new BoardEvents()
export default boardEvents