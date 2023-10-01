import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import Persister from "../lib/Persister";


interface Keys{
    [key: string]: string
}
const initialState: Keys = Persister.load('rooms', {})

const sliceReducer = createSlice({
    name: 'slice',
    initialState: initialState,
    reducers: {
        setRoom: (state, action: PayloadAction<{publicId: string, privateId: string}>) => {
            state[action.payload.publicId] = action.payload.privateId
        },
    }
})

export const {setRoom} = sliceReducer.actions
export default sliceReducer.reducer