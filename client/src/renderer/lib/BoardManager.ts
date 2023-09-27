import ReconnectingWebSocket, { Event, ErrorEvent, CloseEvent } from 'reconnecting-websocket'
import { IHistoryState } from '../features/history'
import { doRequest } from './twiks'

// BoardManager
interface Handlers{
    onMessage?: (msg: string) => void,
    onError?: (e: ErrorEvent) => void,
    onClose?: (e: CloseEvent) => void,
    onOpen?: (e: Event) => void
}

interface BoardOptions{
    url?: string,
    handlers: Handlers
}

interface BoardStatus{
    connected: boolean,
    roomId: string|undefined
}

// board message schemes
export interface Join { room_id: string }
export interface Quit { room_id: string }
// implement UpdateAction: { private_key: string, action_id: string,  }
export interface Undo { private_key: string, action_id: string }
export interface Redo { private_key: string, action_id: string }
export interface Push { private_key: string, data: Array<string> }
export interface Pull { current_len: number, undone_len: number }
export interface Info { status: string, payload: string }
// board message
export type BoardMessage = Join | Quit | Undo | Redo | Push | Pull | Info
export type MessageType = 'Join' | 'Quit' | 'Undo' | 'Redo' | 'Push' | 'Pull' | 'Info'
// errors
export class TimeOutError extends Error{
    constructor(msg = "connection timeout after", durationMs: number, options?: ErrorOptions){
        super(msg, options)
        this.message = `${msg} ${durationMs} ms waiting`
    }
}
// api types
export interface RoomInfo{ public_id: string, private_id: string }

// board manager
export default class BoardManager{
    url: string
    rws: ReconnectingWebSocket|undefined
    handlers: Handlers = {}
    status: BoardStatus = {
        connected: false,
        roomId: undefined
    }

    constructor(options: BoardOptions){
        this.url = options.url ?? `ws://${location.host}/board`
        this.handlers = options.handlers
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

    connect(){
        this.rws = new ReconnectingWebSocket(this.url, [], {
            connectionTimeout: 1000,
            maxRetries: 10,
        });

        this.rws.addEventListener('open', this.#openHandler)
        this.rws.addEventListener('close', this.#closeHandler)
        this.rws.addEventListener('error', this.#errorHandler)
        this.rws.addEventListener('message', this.#messageHandler)
    }

    disconnect(){
        if (this.rws === undefined) throw new Error('cannot disconnect without a connection')
        // remove listeners
        this.rws.removeEventListener('open', this.#openHandler)
        this.rws.removeEventListener('close', this.#closeHandler)
        this.rws.removeEventListener('error', this.#errorHandler)
        this.rws.removeEventListener('message', this.#messageHandler)
        // update status
        this.status = {
            connected: false,
            roomId: undefined
        }
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
                    if (response.status === "ok"){
                        // clear listeners
                        clearTimeout(timeout)
                        this.rws?.removeEventListener('message', waiter)
                        res(response)
                    }
            }
            this.rws?.addEventListener('message', waiter)
            // do request
            this.send('Join', { room_id: roomId })            
        } )
    }

    async createRoom(history: IHistoryState){
        const roomInitials = {
            current: history.current.map( i => JSON.stringify(i) ),
            undone: history.undone.map( i => JSON.stringify(i) )
        }

        return await (await doRequest('rooms/create', roomInitials)).json()
    }

    async deleteRoom(roomId: string, privateId: string): Promise<Info>{
        return await doRequest('rooms/delete', { room_id: roomId, private_id: privateId })
    }
    
    send(messageType: MessageType, data: BoardMessage ){
        if (this.rws === undefined) throw new Error('cannot send without a connection')

        const msg = new Map()
        msg.set(messageType, data)
        
        this.rws.send(JSON.stringify(
            Object.fromEntries(msg)
        ))
    }

}