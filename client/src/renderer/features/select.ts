import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import IShape from "../base/typing/IShape";


export type Selection = IShape[]
const initialSelection: Selection = []

const sliceReducer = createSlice({
    name: 'slice',
    initialState: {
        selection: initialSelection
    },
    reducers: {
        setSelection: (state, action: PayloadAction<Selection>) => {
            state.selection = action.payload
        },
        emptySelection: (state) => {
            state.selection = []
        }
    }
})

export const {setSelection, emptySelection} = sliceReducer.actions
export default sliceReducer.reducer