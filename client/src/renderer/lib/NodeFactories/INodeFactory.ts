import { Node } from "konva/lib/Node";


export default interface INodeFactory{
    create(amount: number): Node[]
}