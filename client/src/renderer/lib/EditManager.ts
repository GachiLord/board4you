import CanvasUtils from "./CanvasUtils";
import store from "../store/store";
import { emptyUndone, undo, redo } from "../features/history";
import Konva from "konva";
import IShape from "../base/typing/IShape";
import { itemIn } from "./twiks";


export interface IAdd{
    type: 'add' 
    shape: IShape
}

export interface IRemove{
    type: 'remove',
    shapes: IShape[]
}

export interface IModify{
    type: 'modify',
    current: IShape[],
    initial: IShape[]
}

export type Edit = IAdd | IRemove | IModify


export default class EditManager{
    layer:Konva.Layer

    constructor(layer: Konva.Layer){
        this.layer = layer
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

    rebase(){
        store.dispatch(emptyUndone())
    }

    undo(){
        const lastEdit = store.getState().history.current.at(-1)
        if (!lastEdit) return

        this.cancelEdit(lastEdit)
        store.dispatch(undo())
    }

    redo(){
        const lastEdit = store.getState().history.undone.at(-1)
        if (!lastEdit) return

        this.applyEdit(lastEdit)
        store.dispatch(redo())
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
                    shapeToModify.setAttrs({ ...attrs, connected: new Set(...attrs.connected) })
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
                    shapeToModify.setAttrs({ ...attrs, connected: new Set(...attrs.connected) })
                } )
                break
        }
    }
}