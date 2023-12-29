import {
    ArrayQueue,
    ConstantBackoff,
    ReconnectEventDetail,
    RetryEventDetail,
    Websocket,
    WebsocketBuilder,
    WebsocketEvent,
  } from "websocket-ts";
import { IHistoryState } from '../../features/history'
import { doRequest } from '../twiks'
import { Handlers, BoardStatus, BoardOptions, Info, TimeOutError, NoSushRoomError, RoomInfo, MessageType, BoardMessage } from './typing'
import ISize from '../../base/typing/ISize'
import store from '../../store/store'


export default class BoardManager{
    url: string
    rws: Websocket|null
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

    #closeHandler = (_: unknown, e: CloseEvent) => {
        this.status.connected = false
        if (this.handlers.onClose) this.handlers.onClose(e)
    }

    #errorHandler = (_: unknown, e: Event) => {
        if (this.handlers.onError) this.handlers.onError(e)
    }

    #messageHandler = (_: unknown, e: MessageEvent<string>) => {
        if (typeof e.data !== 'string') throw new TypeError('message has unsupported type')
        if (this.handlers.onMessage) this.handlers.onMessage(e.data)
    }

    #retryHandler = (_: unknown, e : CustomEvent<RetryEventDetail>) => {
        if (this.handlers.retry) this.handlers.retry(e)
    }

    #recconectHandler = (_: unknown, e: CustomEvent<ReconnectEventDetail>) => {
        if (this.handlers.reconnect) this.handlers.reconnect(e)
    }

    async connect(): Promise<Event>{
        return new Promise(res => {
            this.rws = new WebsocketBuilder(this.url)
                .withBuffer(new ArrayQueue())           // buffer messages when disconnected
                .withBackoff(new ConstantBackoff(1000)) // retry every 1s
                .build();
            
            this.rws.addEventListener(WebsocketEvent.open, (_, e) => {
                this.#openHandler(e)
                res(e)
            })
            this.rws.addEventListener(WebsocketEvent.close, this.#closeHandler)
            this.rws.addEventListener(WebsocketEvent.error, this.#errorHandler)
            this.rws.addEventListener(WebsocketEvent.message, this.#messageHandler)
            this.rws.addEventListener(WebsocketEvent.retry, this.#retryHandler)
            this.rws.addEventListener(WebsocketEvent.reconnect, this.#recconectHandler)
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
        this.rws.removeEventListener(WebsocketEvent.close, this.#closeHandler)
        this.rws.removeEventListener(WebsocketEvent.error, this.#errorHandler)
        this.rws.removeEventListener(WebsocketEvent.message, this.#messageHandler)
        this.rws.removeEventListener(WebsocketEvent.retry, this.#retryHandler)
        this.rws.removeEventListener(WebsocketEvent.reconnect, this.#recconectHandler)
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
            const waiter = ( _: unknown, e: MessageEvent<string> ) => {
                const response = JSON.parse(e.data)
                if (response.Info && response.Info.status === "ok" && response.Info.action === 'Join'){
                    // add status
                    this.status.roomId = response.Info.payload.public_id
                    // clear listeners
                    clearTimeout(timeout)
                    this.rws?.removeEventListener(WebsocketEvent.message, waiter)
                    res(response.Info)
                }
                else if (response.Info && response.Info.status === "bad" && response.Info.action === 'Join'){
                    rej(new NoSushRoomError(undefined, roomId))
                }
            }
            this.rws?.addEventListener(WebsocketEvent.message, waiter)
            // do request
            this.send('Join', { public_id: roomId })            
        } )
    }

    quitRoom(roomId: string){
        this.send('Quit', { public_id: roomId })
    }

    static async createRoom(history: IHistoryState, size: ISize, title: string): Promise<RoomInfo>{
        const roomInitials = {
            current: history.current.map( i => JSON.stringify(i) ),
            undone: history.undone.map( i => JSON.stringify(i) ),
            size: size,
            title: title
        }
        return await doRequest('room', roomInitials, 'POST')
    }

    static async deleteRoom(roomId: string, privateId: string): Promise<Info>{
        return await doRequest('room', { public_id: roomId, private_id: privateId }, 'DELETE')
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
