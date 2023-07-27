import CanvasUtils from "../CanvasUtils"
import INodeFactory from "./INodeFactory"
import NodeFactory from "./NodeFactory"
import { v4 as uuid4 } from 'uuid'
import { Shape } from "konva/lib/Shape"


export default class LineFactory extends NodeFactory implements INodeFactory{

    create(amount: number): Shape[] {
        return this.#getRandomLinesObjects(amount)
    }

    #getRandomCoors(amount = 2){
        const coors: number[] = []
        
        for (let i = 0; i < amount; i++){
            coors.push(Math.random() * this._height, Math.random() * this._width)
        }

        return coors
    }

    #getRandomLinesObjects(amount = 1, length = 50){
        const lines = []

        for (let i = 0; i < amount; i++){
            lines.push(CanvasUtils.toKonvaObject(
                {   
                    tool: 'pen',
                    points: this.#getRandomCoors(length),
                    type: 'line', 
                    color: 'black',
                    shapeId: uuid4(),
                    x: 0, 
                    y: 0,
                    lineSize: 2,
                    lineType: 'general'
                }
            ))
        }

        return lines
    }
}