import { ReconnectEventDetail, RetryEventDetail } from 'websocket-ts'
import { UndoRedo, Pull, Empty, SetSize, SetTitle, Auth, Add, Remove, Modify, UndoRedoData, EmptyData, SizeData, TitleData, QuitData, Info, Authed } from '../../lib/protocol'

export interface Handlers {
  onMessage?: (msg: Uint8Array) => void,
  onError?: (e: WebSocketEventMap["error"]) => void,
  onClose?: (e: WebSocketEventMap["close"]) => void,
  onOpen?: (e: WebSocketEventMap["open"]) => void,
  retry?: (e: CustomEvent<RetryEventDetail>) => void;
  reconnect?: (e: CustomEvent<ReconnectEventDetail>) => void;
}

export interface BoardOptions {
  url?: string,
  handlers?: Handlers
}

export interface BoardStatus {
  connected: boolean,
  roomId: string | null
}
// user messages
export interface Edit {
  edit: {
    Add?: Add,
    Remove?: Remove,
    Modify?: Modify
  }
}
export interface Push {
  data: Edit[]
  silent: boolean
}
export type UserMessage = UndoRedo | Push | Pull |
  Empty | SetSize | SetTitle | Auth
export type UserMessageType = 'UndoRedo' | 'Push' | 'Pull' | 'Empty' | 'SetSize' | 'SetTitle' | 'Auth'
// server messages 
export interface PushData {
  data: Edit[]
}
export interface UpdateCoEditorData { }
export interface EditData {
  should_be_created_edits: Edit[],
  should_be_deleted_ids: String[],
}
export interface PullData {
  current: EditData,
  undone: EditData
}
export type ServerMessage =
  PushData |
  UndoRedoData |
  EmptyData |
  SizeData |
  TitleData |
  QuitData |
  UpdateCoEditorData |
  PullData |
  Info |
  Authed
// errors
export class TimeOutError extends Error {
  constructor(msg = "connection timeout after", durationMs: number, options?: ErrorOptions) {
    super(msg, options)
    this.message = `${msg} ${durationMs} ms waiting`
  }
}
export class NoSushRoomError extends Error {
  constructor(msg = "no such room with id", roomId: string, options?: ErrorOptions) {
    super(msg, options)
    this.message = `${msg} ${roomId}`
  }
}
// api types
export interface RoomInfo { public_id: string, private_id: string }
