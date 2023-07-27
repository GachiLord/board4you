import ISize from "../../base/typing/ISize";


interface NodeFactoryConfig{
    positionRestrictions: ISize
}

export default abstract class NodeFactory{
    _width: number
    _height: number

    constructor(config: NodeFactoryConfig = {positionRestrictions: {height: 900, width: 900} }){
        this._height = config.positionRestrictions.height
        this._width = config.positionRestrictions.width
    }
}