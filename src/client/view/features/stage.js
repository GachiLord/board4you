import { createSlice } from "@reduxjs/toolkit";
import setCanvasSize from "../../model/setCanvasSize";
import getCanvasSize from "../../model/CommonGetCanvasSize";


export const stageSlice = createSlice({
    name: 'stage',
    initialState: {
        height: getCanvasSize().height,
        // height of canvas
        baseHeight: getCanvasSize().height,
        // height of visible part of canvas
        width: getCanvasSize().width,
        // width of canvas
        stagePos: {x: 0,y: 0},
        // the parameter is responsible for the position of the scope
        lastPointerPos: {x:0, y:0},
        // position of the last click
        isDrawable: false,
        // flag is active when mouse key is pressed on canvas with drawing tool 
        isDraggable: false,
        // active when selected tool is "move"
        renderOutOfView: false
        /*
        if flag is active all shapes will be rendered
        Otherwise, only visible shapes will be rendered
        */
    },
    reducers: {
        setHeight: (state, action) => {state.height = action.payload},
        setBaseHeight: (state, action) => {
            state.baseHeight = action.payload
            // update value in localStorage
            setCanvasSize(action.payload)
        },
        setWidth: (state, action) => {
            state.width = action.payload
            // update value in localStorage
            setCanvasSize(action.payload)
        },
        setStagePos: (state, action) => { state.stagePos = action.payload },
        setLastPointerPos: (state, action) => { state.lastPointerPos = action.payload },
        setDrawable: (state, action) => { state.isDrawable = action.payload },
        setDraggable: (state, action) => { state.isDraggable = action.payload },
        setRenderOutOfView: (state, action) => { state.renderOutOfView = action.payload }
    }
})


export const {  setHeight, setBaseHeight, setWidth, setStagePos, setLastPointerPos,
                setDrawable, setDraggable, setRenderOutOfView} = stageSlice.actions
export default stageSlice.reducer