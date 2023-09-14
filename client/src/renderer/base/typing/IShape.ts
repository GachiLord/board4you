import { ShapeType } from "./ShapeType";
import { ToolName } from "./ToolName";

export default interface IShape{
    [index: string]: unknown,
    tool: ToolName,
    type: ShapeType, 
    color?: string,
    shapeId: string, 
    lineSize?: number, 
    lineType?: string,
    height?: number, 
    width?: number, 
    radiusX?: number, 
    radiusY?: number, 
    rotation?: number,
    scaleX?: number, 
    scaleY?: number, 
    skewX?: number, 
    skewY?: number, 
    points?: number[], 
    x: number, 
    y: number, 
    connected?: string[],
    url?: string
}