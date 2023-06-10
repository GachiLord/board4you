import { PayloadAction, createSlice } from "@reduxjs/toolkit";



export interface IProgress{
    isLoading: boolean,
    last: number,
    current: number
}

const initialState: IProgress = {
    isLoading: false,
    last: 1,
    current: 1
}

const progressSlice = createSlice({
    name: 'progress',
    initialState: initialState,
    reducers: {
        start: (state, action: PayloadAction<{last: number, current: number}>) => {
            state.isLoading = true
            state.current = action.payload.current
            state.last = action.payload.last
        },
        stop: state => {
            state.isLoading = initialState.isLoading
        },
        update: (state, action: PayloadAction<number>) => {
            state.current = action.payload
            if (state.last === action.payload){
                state.isLoading = initialState.isLoading
            }
        }
    }
})

export const {start, stop, update} = progressSlice.actions
export default progressSlice.reducer