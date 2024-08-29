/* tslint:disable */
/* eslint-disable */
/**
*/
export function start(): void;
/**
* @param {Uint8Array} buf
* @returns {any}
*/
export function decode_server_msg(buf: Uint8Array): any;
/**
* @param {any} msg
* @returns {Uint8Array}
*/
export function encode_user_msg(msg: any): Uint8Array;
/**
*/
export enum ActionType {
  Undo = 0,
  Redo = 1,
}
/**
*/
export enum EmptyActionType {
  Current = 0,
  Undone = 1,
}
/**
*/
export enum LineType {
  General = 0,
  Dashed = 1,
}
/**
*/
export enum ShapeType {
  Line = 0,
  Arrow = 1,
  Rect = 2,
  Ellipse = 3,
  Img = 4,
}
/**
*/
export enum Tool {
  PenTool = 0,
  LineTool = 1,
  ArrowTool = 3,
  RectTool = 4,
  EllipseTool = 5,
  EraserTool = 6,
  MoveTool = 7,
  SelectTool = 8,
  ImgTool = 9,
}
/**
*/
export class Add {
  free(): void;
/**
*/
  id: string;
/**
*/
  shape?: Shape;
}
/**
*/
export class Auth {
  free(): void;
/**
*/
  token: string;
}
/**
*/
export class Authed {
  free(): void;
}
/**
*/
export class BoardSize {
  free(): void;
/**
*/
  height: number;
/**
*/
  width: number;
}
/**
*/
export class Empty {
  free(): void;
/**
*/
  action_type: number;
}
/**
*/
export class EmptyData {
  free(): void;
/**
*/
  action_type: number;
}
/**
*/
export class Info {
  free(): void;
/**
*/
  action: string;
/**
*/
  payload: string;
/**
*/
  status: string;
}
/**
*/
export class Modify {
  free(): void;
/**
*/
  current: (Shape)[];
/**
*/
  id: string;
/**
*/
  initial: (Shape)[];
}
/**
*/
export class Pull {
  free(): void;
/**
*/
  current: (string)[];
/**
*/
  undone: (string)[];
}
/**
*/
export class QuitData {
  free(): void;
}
/**
*/
export class Remove {
  free(): void;
/**
*/
  id: string;
/**
*/
  shapes: (Shape)[];
}
/**
*/
export class SetSize {
  free(): void;
/**
*/
  data?: BoardSize;
}
/**
*/
export class SetTitle {
  free(): void;
/**
*/
  title: string;
}
/**
*/
export class Shape {
  free(): void;
/**
*/
  color: string;
/**
*/
  connected: (string)[];
/**
*/
  height: number;
/**
*/
  line_size: number;
/**
*/
  line_type: number;
/**
*/
  points: Uint32Array;
/**
*/
  radius_x: number;
/**
*/
  radius_y: number;
/**
*/
  rotation: number;
/**
*/
  scale_x: number;
/**
*/
  scale_y: number;
/**
*/
  shape_id: string;
/**
*/
  shape_type: number;
/**
*/
  skew_x: number;
/**
*/
  skew_y: number;
/**
*/
  tool: number;
/**
*/
  url: string;
/**
*/
  width: number;
/**
*/
  x: number;
/**
*/
  y: number;
}
/**
*/
export class SizeData {
  free(): void;
/**
*/
  data?: BoardSize;
}
/**
*/
export class TitleData {
  free(): void;
/**
*/
  title: string;
}
/**
*/
export class UndoRedo {
  free(): void;
/**
*/
  action_id: string;
/**
*/
  action_type: number;
}
/**
*/
export class UndoRedoData {
  free(): void;
/**
*/
  action_id: string;
/**
*/
  action_type: number;
}
/**
*/
export class UpdateCoEditorData {
  free(): void;
}
