import { createSlice } from "@reduxjs/toolkit";


const sliceReducer = createSlice({
    name: 'slice',
    initialState: {
        selection: [] 
    },
    reducers: {
        setSelection: (state, action) => {
            state.selection = action.payload
        },
        emptySelection: (state) => {
            state.selection = []
        }
    }
})

export const {setSelection, emptySelection} = sliceReducer.actions
export default sliceReducer.reducer