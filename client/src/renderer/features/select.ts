import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Shape } from "../lib/protocol/protocol";


export type Selection = Shape[]
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

export const { setSelection, emptySelection } = sliceReducer.actions
export default sliceReducer.reducer
