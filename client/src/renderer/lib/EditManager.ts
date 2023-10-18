import CanvasUtils from "./CanvasUtils";
import store from "../store/store";
import { emptyUndone, undo, redo } from "../features/history";
import Konva from "konva";
import IShape from "../base/typing/IShape";
import { itemIn } from "./twiks";
import BoardManager from "./BoardManager/BoardManager";


export interface IAdd{
    id: string
    type: 'add' 
    shape: IShape
}

export interface IRemove{
    id: string
    type: 'remove'
    shapes: IShape[]
}

export interface IModify{
    id: string
    type: 'modify'
    current: IShape[]
    initial: IShape[]
}

export type Edit = IAdd | IRemove | IModify


export default class EditManager{
    layer: Konva.Layer
    boardManager: BoardManager

    constructor(layer: Konva.Layer, boardManager: BoardManager){
        this.layer = layer
        this.boardManager = boardManager
    }

    static getHistoryImprint(){
        const history = store.getState().history
        return {
            current: history.current.map( e => e.id ),
            undone: history.undone.map( e => e.id )
        }
    }

    static getEditFromShape(shape: IShape){
        return {
            type: 'add',
            shape : shape
        } 
    }

    static getEditFromKonvaObject(obj: Konva.Shape){
        return EditManager.getEditFromShape(CanvasUtils.toShape(obj))
    }

    #share(action_type: 'Undo'|'Redo', action_id: string){
        if (!this.boardManager.status.connected) return

        const public_id = this.boardManager.status.roomId
        const private_id = store.getState().rooms[public_id]
        this.boardManager.send(
            'UndoRedo',
            { 
                public_id, 
                private_id,
                action_type,
                action_id
            }
        )
    }

    rebase(){
        store.dispatch(emptyUndone())
    }

    undo(edit_id?: string, silent?: boolean){
        const current = store.getState().history.current
        const lastEdit = edit_id ? current.findLast(v => v.id === edit_id) : current.at(-1)
        if (!lastEdit) return

        this.cancelEdit(lastEdit)
        store.dispatch(undo(edit_id))
        // send msg
        if (!silent) this.#share('Undo', lastEdit.id)
    }

    redo(edit_id?: string, silent?: boolean){
        const undone = store.getState().history.undone
        const lastEdit = edit_id ? undone.findLast(v => v.id === edit_id) : undone.at(-1)
        if (!lastEdit) return

        this.applyEdit(lastEdit)
        store.dispatch(redo())
        // send msg
        if (!silent) this.#share('Redo', lastEdit.id)
    }

    applyEdit(edit: Edit){
        switch(edit.type){
            case 'add':{
                const shapeToAdd = CanvasUtils.toKonvaObject(edit.shape)
                if (!itemIn(edit.shape.tool, 'img', 'rect')) shapeToAdd.cache()
                this.layer.add(shapeToAdd)
                break
            }
            case 'remove':
                edit.shapes.forEach( shape => {
                    CanvasUtils.findOne(this.layer, {shapeId: shape.shapeId}).destroy()
                } )
                break
            case 'modify':
                edit.current.forEach( (attrs) => {
                    const shapeToModify = CanvasUtils.findOne(this.layer, {shapeId: attrs.shapeId})
                    shapeToModify.setAttrs({ ...attrs, connected: new Set(attrs.connected) })
                } )    
                break
        }
    }

    cancelEdit(edit: Edit){
        switch(edit.type){
            case 'add':{
                const shapeToRemove = CanvasUtils.findOne(this.layer, {shapeId: edit.shape.shapeId})
                shapeToRemove.destroy()
                break
            }
            case 'remove':
                edit.shapes.forEach( shape => {
                    const shapeToAdd = CanvasUtils.toKonvaObject(shape)
                    shapeToAdd.cache()
                    this.layer.add(shapeToAdd)
                } )
                break
            case 'modify':
                edit.initial.forEach( (attrs) => {
                    const shapeToModify = CanvasUtils.findOne(this.layer, {shapeId: attrs.shapeId})
                    shapeToModify.setAttrs({ ...attrs, connected: new Set(attrs.connected) })
                } )
                break
        }
    }
}