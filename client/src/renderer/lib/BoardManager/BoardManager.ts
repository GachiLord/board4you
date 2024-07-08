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
import { Handlers, BoardStatus, BoardOptions, RoomInfo, UserMessage, UserMessageType } from './typing'
import ISize from '../../base/typing/ISize'
import store from '../../store/store'
import { convertToEnum } from "../../board/canvas/share/convert";
import { request } from "../request";
import { encode_user_msg, Info } from "../protocol/protocol";


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

  #messageHandler = (_: unknown, e: MessageEvent<ArrayBuffer>) => {
    const buf = new Uint8Array(e.data)
    if (this.handlers.onMessage) this.handlers.onMessage(buf)
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
      this.rws.binaryType = 'arraybuffer'

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

  send(messageType: UserMessageType, data: UserMessage) {
    if (this.rws == null) throw new Error('cannot send without a connection')

    const msg = new Map()
    msg.set(messageType, data)
    const encoded = encode_user_msg({ msg: Object.fromEntries(msg) })

    this.rws.send(encoded)
  }

  getCredentials() {
    const public_id = this.status.roomId
    const private_id = store.getState().rooms[public_id]

    if (!private_id) throw ('this method should be called by user having private_id')

    return { private_id, public_id }
  }

}
