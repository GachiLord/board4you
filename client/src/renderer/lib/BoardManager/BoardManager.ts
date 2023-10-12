import ReconnectingWebSocket, { Event, ErrorEvent, CloseEvent } from 'reconnecting-websocket'
import { IHistoryState } from '../../features/history'
import { doRequest } from '../twiks'
import { Handlers, BoardStatus, BoardOptions, Info, TimeOutError, NoSushRoomError, RoomInfo, MessageType, BoardMessage } from './typing'
import ISize from '../../base/typing/ISize'
import store from '../../store/store'


export default class BoardManager{
    url: string
    rws: ReconnectingWebSocket|null
    handlers: Handlers = {}
    status: BoardStatus = {
        connected: false,
        roomId: null
    }

    constructor(options?: BoardOptions){
        this.url = options?.url ?? `${location.protocol === 'https:' ? 'wss': 'ws'}://${location.host}/board`
    }

    #openHandler = (e: Event) => {
        this.status.connected = true
        if (this.handlers.onOpen) this.handlers.onOpen(e)
    }

    #closeHandler = (e: CloseEvent) => {
        this.status.connected = false
        if (this.handlers.onClose) this.handlers.onClose(e)
    }

    #errorHandler = (e: ErrorEvent) => {
        if (this.handlers.onError) this.handlers.onError(e)
    }

    #messageHandler = (e: MessageEvent<string>) => {
        if (typeof e.data !== 'string') throw new TypeError('message has unsupported type')
        if (this.handlers.onMessage) this.handlers.onMessage(e.data)
    }

    async connect(): Promise<Event>{
        return new Promise(res => {
            this.rws = new ReconnectingWebSocket(this.url, [], {
                connectionTimeout: 1000,
                maxRetries: 10,
            });
    
            this.rws.addEventListener('open', (e) => {
                this.#openHandler(e)
                res(e)
            })
            this.rws.addEventListener('close', this.#closeHandler)
            this.rws.addEventListener('error', this.#errorHandler)
            this.rws.addEventListener('message', this.#messageHandler)
        })
    }

    disconnect(){
        // update status
        this.status = {
            connected: false,
            roomId: null
        }
        if (this.rws == null) return
        // remove listeners
        this.rws.removeEventListener('open', this.#openHandler)
        this.rws.removeEventListener('close', this.#closeHandler)
        this.rws.removeEventListener('error', this.#errorHandler)
        this.rws.removeEventListener('message', this.#messageHandler)
        // close connection
        this.rws.close()
    }
    
    joinRoom(roomId: string): Promise<Info>{
        return new Promise( (res, rej) => {
            // set connection timeout
            const timeout = setTimeout( () => {
                rej(new TimeOutError('connection timeout', 10000))
            }, 10000 )
            // set connection waiter
            const waiter = ( e: MessageEvent<string> ) => {
                const response = JSON.parse(e.data)
                if (response.status === "ok" && response.action === 'Join'){
                    // add status
                    this.status.roomId = response.payload.public_id
                    // clear listeners
                    clearTimeout(timeout)
                    this.rws?.removeEventListener('message', waiter)
                    res(response)
                }
                else if (response.status === "bad" && response.action === 'Join'){
                    rej(new NoSushRoomError(undefined, roomId))
                }
            }
            this.rws?.addEventListener('message', waiter)
            // do request
            this.send('Join', { public_id: roomId })            
        } )
    }

    quitRoom(roomId: string){
        this.send('Quit', { public_id: roomId })
    }

    static async createRoom(history: IHistoryState, size: ISize): Promise<RoomInfo>{
        const roomInitials = {
            current: history.current.map( i => JSON.stringify(i) ),
            undone: history.undone.map( i => JSON.stringify(i) ),
            size: size
        }

        return doRequest('rooms/create', roomInitials)
    }

    static async deleteRoom(roomId: string, privateId: string): Promise<Info>{
        return doRequest('rooms/delete', { room_id: roomId, private_id: privateId })
    }
    
    send(messageType: MessageType, data: BoardMessage){
        if (this.rws == null) throw new Error('cannot send without a connection')

        const msg = new Map()
        msg.set(messageType, data)
        
        this.rws.send(JSON.stringify(
            Object.fromEntries(msg)
        ))
    }

    getCredentials(){
        const public_id = this.status.roomId
        const private_id = store.getState().rooms[public_id]

        if (!private_id) throw('this method should be called by user having private_id') 

        return {private_id, public_id}
    }

    isShared(){
        return this.status.roomId != null
    }

    canShare(){
        return this.isShared() && this.isAuthor()
    }

    isAuthor(){
        return store.getState().rooms[this.status.roomId] != undefined
    }

    canEdit(){
        return this.isAuthor() || !this.isShared() 
    }

}