import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import Persister from "../lib/Persister";


interface Keys {
  [key: string]: string
}
const initialState: Keys = Persister.load('rooms', {})

const sliceReducer = createSlice({
  name: 'slice',
  initialState: initialState,
  reducers: {
    setRoom: (state, action: PayloadAction<{ publicId: string, privateId: string }>) => {
      state[action.payload.publicId] = action.payload.privateId
    },
    deleteRoom: (state, action: PayloadAction<string>) => {
      delete state[action.payload]
    },
    emptyRooms: (state) => {
      Object.keys(state).forEach(key => {
        delete state[key]
      })
    }
  }
})

export const { setRoom, deleteRoom, emptyRooms } = sliceReducer.actions
export default sliceReducer.reducer
