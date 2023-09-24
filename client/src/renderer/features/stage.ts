import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import getCanvasSize from "../../common/getCanvasSize";
import { ICoor } from "../base/typing/ICoor";



export interface IStageState{
    height: number,
    baseHeight: number,
    width: number,
    stagePos: {x: number,y: number},
    isDrawable: boolean,
    isDraggable: boolean,
}

const initialState: IStageState = {
    height: getCanvasSize().height,
    // height of canvas
    baseHeight: getCanvasSize().height,
    // height of visible part of canvas
    width: getCanvasSize().width,
    // width of canvas
    stagePos: {x: 0,y: 0},
    // the parameter is responsible for the position of the scope
    isDrawable: false,
    // flag is active when mouse key is pressed on canvas with drawing tool 
    isDraggable: false,
    // active when selected tool is "move"
}

export const stageSlice = createSlice({
    name: 'stage',
    initialState: initialState,
    reducers: {
        setHeight: (state, action: PayloadAction<number>) => {state.height = action.payload},
        setBaseHeight: (state, action: PayloadAction<number>) => {
            state.baseHeight = action.payload
        },
        setWidth: (state, action: PayloadAction<number>) => {
            state.width = action.payload
        },
        setStagePos: (state, action: PayloadAction<ICoor>) => { state.stagePos = action.payload },
        setDrawable: (state, action: PayloadAction<boolean>) => { state.isDrawable = action.payload },
        setDraggable: (state, action: PayloadAction<boolean>) => { state.isDraggable = action.payload },
    }
})


export const {  setHeight, setBaseHeight, setWidth, setStagePos, setDrawable, setDraggable} = stageSlice.actions
export default stageSlice.reducer