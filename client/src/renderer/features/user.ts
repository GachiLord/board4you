import { PayloadAction, createSlice } from "@reduxjs/toolkit";


export type User = {
    login: string,
    nickName: string,
    firstName: string,
    secondName: string
}
export interface AuthState { user?: User, authed: boolean }


const initialState: AuthState = { authed: false };

const sliceReducer = createSlice({
    name: 'slice',
    initialState: initialState,
    reducers: {
        addUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload
            state.authed = true
        },
        deleteUser: (state) => {
            state.user = null
            state.authed = false
        }
    }
})

export const {addUser, deleteUser} = sliceReducer.actions
export default sliceReducer.reducer