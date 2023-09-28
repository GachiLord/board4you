import { PayloadAction, createSlice } from "@reduxjs/toolkit";


export interface Board{
    mode: 'shared'|'local'
} 
const initialState: Board = {
    mode: 'local'
}

const sliceReducer = createSlice({
    name: 'slice',
    initialState: initialState,
    reducers: {
        setMode: (state, action: PayloadAction<'shared'|'local'>) => {
            state.mode = action.payload
        },
    }
})

export const {setMode} = sliceReducer.actions
export default sliceReducer.reducer