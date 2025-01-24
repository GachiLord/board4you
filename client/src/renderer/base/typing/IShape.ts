import { LineType, ShapeType, Tool } from "../../lib/protocol/protocol";

export default interface IShape {
  [index: string]: unknown,
  tool: Tool,
  shape_type: ShapeType,
  color?: string,
  shape_id: string,
  line_size?: number,
  line_type?: LineType,
  height?: number,
  width?: number,
  radius_x?: number,
  radius_y?: number,
  rotation?: number,
  scale_x?: number,
  scale_y?: number,
  skew_x?: number,
  skew_y?: number,
  points?: number[],
  x: number,
  y: number,
  connected?: string[],
  url?: string
}
