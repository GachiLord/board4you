import { PayloadAction, createSlice } from "@reduxjs/toolkit";
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
        set: (state, action: PayloadAction<ToolName>) => {
            const newTool: any = action.payload
            state.active = newTool
        }
    }
})


export const { set } = toolSlice.actions
export default toolSlice.reducer