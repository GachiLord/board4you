import { createSlice } from "@reduxjs/toolkit";
import { ToolName } from "../base/typing/ToolName";


export interface IToolState{
    active: ToolName
}

const defaultTool: ToolName = 'pen'

const toolSlice = createSlice({
    name: 'tool',
    initialState: {
        active: defaultTool
    },
    reducers: {
        set: (state, action) => {
            state.active = action.payload
        }
    }
})


export const { set } = toolSlice.actions
export default toolSlice.reducer