import {
  ArrayQueue,
  LinearBackoff,
  ReconnectEventDetail,
  RetryEventDetail,
  Websocket,
  WebsocketBuilder,
  WebsocketEvent,
} from "websocket-ts";
import { IHistoryState } from '../../features/history'
import { Handlers, BoardStatus, BoardOptions, Info, RoomInfo, MessageType, BoardMessage } from './typing'
import ISize from '../../base/typing/ISize'
import store from '../../store/store'
import { convertToEnum } from "../../board/canvas/share/convert";
import { request } from "../request";


export default class BoardManager {
  url: string
  rws: Websocket | null
  handlers: Handlers = {}
  status: BoardStatus = {
    connected: false,
    roomId: null
  }

  constructor(options?: BoardOptions) {
    this.url = options?.url ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/board`
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

  #retryHandler = (_: unknown, e: CustomEvent<RetryEventDetail>) => {
    if (this.handlers.retry) this.handlers.retry(e)
  }

  #recconectHandler = (_: unknown, e: CustomEvent<ReconnectEventDetail>) => {
    if (this.handlers.reconnect) this.handlers.reconnect(e)
  }

  async connect(roomId: string): Promise<Event> {
    return new Promise(res => {
      this.rws = new WebsocketBuilder(this.url + "/" + roomId)
        .withBuffer(new ArrayQueue())           // buffer messages when disconnected
        .withBackoff(new LinearBackoff(0, 1000, 7000)) // retry every 1s
        .build();

      this.rws.addEventListener(WebsocketEvent.open, (_, e) => {
        // add status
        this.status.roomId = roomId
        this.status.connected = true
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

  disconnect() {
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

  quitRoom(roomId: string) {
    this.send('Quit', { public_id: roomId })
  }

  static async createRoom(history: IHistoryState, size: ISize, title: string): Promise<RoomInfo> {
    const roomInitials = {
      current: history.current.map(edit => convertToEnum(edit)),
      undone: history.undone.map(edit => convertToEnum(edit)),
      size: size,
      title: title
    }
    return await request('room').post().body(roomInitials)
  }

  static async deleteRoom(roomId: string, privateId: string): Promise<Info> {
    return await request('room').delete().body({ public_id: roomId, private_id: privateId })
  }

  send(messageType: MessageType, data: BoardMessage) {
    if (this.rws == null) throw new Error('cannot send without a connection')

    const msg = new Map()
    msg.set(messageType, data)

    this.rws.send(JSON.stringify(
      Object.fromEntries(msg)
    ))
  }

  getCredentials() {
    const public_id = this.status.roomId
    const private_id = store.getState().rooms[public_id]

    if (!private_id) throw ('this method should be called by user having private_id')

    return { private_id, public_id }
  }

}
