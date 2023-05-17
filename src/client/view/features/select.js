import { createSlice } from "@reduxjs/toolkit";


export const selectSlice = createSlice({
    name: 'select',
    initialState: {
        attrs: undefined,
        selection: [],
        isDraggable: false,
    },
    reducers: {
        setDraggble: (state, action) => { state.isDraggingSelection = action.payload },
        modifySelection: (state, action) => { state.selection = action.payload },
        modifyAttrs: (state, action) => { state.attrs = action.payload },
        destroy: state => {
            state.attrs = undefined,
            state.selection = undefined
        }
    }
})


export const {setDraggble, modifySelection, modifyAttrs, destroy} = selectSlice.actions
export default selectSlice.reducer