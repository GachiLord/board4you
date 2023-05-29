import CanvasUtils from "./CanvasUtils";
import store from "../view/store/store";
import { emptyUndone, undo, redo } from "../view/features/history";


export default class EditManager{
    constructor(layer){
        this.layer = layer
    }

    static getEditFromShape(shape){
        return {
            type: 'add',
            shape : shape
        } 
    }

    static getEditFromKonvaObject(obj){
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

    applyEdit(edit){
        switch(edit.type){
            case 'add':
                const shapeToAdd = CanvasUtils.toKonvaObject(edit.shape)
                if (edit.shape.tool !== 'img') shapeToAdd.cache()
                this.layer.add(shapeToAdd)
                break
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

    cancelEdit(edit){
        switch(edit.type){
            case 'add':
                const shapeToRemove = CanvasUtils.findOne(this.layer, {shapeId: edit.shape.shapeId})
                shapeToRemove.destroy()
                break
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