import ISize from '../../base/typing/ISize'
import { ReconnectEventDetail, RetryEventDetail } from 'websocket-ts'

export interface Handlers {
  onMessage?: (msg: string) => void,
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

// board message schemes
export interface Join { public_id: string }
export interface Quit { public_id: string }
export interface SetTitle { private_id: string, public_id: string, title: string }
export interface UndoRedo { private_id: string, public_id: string, action_type: 'Undo' | 'Redo', action_id: string }
export interface Push { public_id: string, private_id: string, data: Array<string>, silent: boolean }
export interface PushSegment {
  public_id: string,
  private_id: string,
  action_type: 'Start' | 'Update' | 'End',
  data: unknown
}
export interface SetSize { public_id: string, private_id: string, data: string }
export interface Empty { private_id: string, public_id: string, action_type: string }
export interface Pull { public_id: string, current: string[], undone: string[] }
export interface UpdateCoEditor { public_id: string, private_id: string }
// data interfaces
export interface TitleData { title: string }
export interface Info { status: string, payload: string }
export interface PushData { action: string, data: string[] }
export interface PushSegmentData { action_type: string, data: any }
export interface UndoRedoData { action_type: 'Undo' | 'Redo', action_id: string }
export interface EmptyData { action_type: 'undone' | 'current' | 'history' }
export interface SizeData { data: ISize }
// board message
export type BoardMessage = Join | Quit | UndoRedo | Push | PushSegment | Pull |
  Info | Empty | SetSize | SetTitle | UpdateCoEditor
export type MessageType = 'Join' | 'Quit' | 'UndoRedo' | 'Empty' |
  'Push' | 'PushSegment' | 'PushData' | 'Pull' | 'Info' |
  'SetSize' | 'SetTitle' | 'UpdateCoEditorData' | 'PullData' |
  'PushSegmentData' | 'UndoRedoData' | 'EmptyData' | 'SizeData' |
  'TitleData' | 'Info' | 'QuitData' | 'UpdateCoEditor'
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
