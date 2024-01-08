import { PayloadAction, createSlice } from "@reduxjs/toolkit";


export interface Board {
  mode: 'shared' | 'local',
  title: string
}
const initialState: Board = {
  mode: 'local',
  title: ''
}

const sliceReducer = createSlice({
  name: 'slice',
  initialState: initialState,
  reducers: {
    setMode: (state, action: PayloadAction<'shared' | 'local'>) => {
      state.mode = action.payload
    },
    setTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload
    }
  }
})

export const { setMode, setTitle } = sliceReducer.actions
export default sliceReducer.reducer
