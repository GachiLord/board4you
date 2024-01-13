import { PayloadAction, createSlice } from "@reduxjs/toolkit";


interface ShareInfo {
  roomId?: string
  privateId?: string
  inviteId?: string
}

export type Mode = 'viewer' | 'author' | 'coop' | 'local'

export interface Board {
  mode: Mode
  title: string
  shareInfo?: ShareInfo
}

const initialState: Board = {
  mode: 'local',
  title: '',
  shareInfo: {}
}

const sliceReducer = createSlice({
  name: 'slice',
  initialState: initialState,
  reducers: {
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload
    },
    setTitle: (state, action: PayloadAction<string>) => {
      state.title = action.payload
    },
    setInviteId: (state, action: PayloadAction<string>) => {
      state.shareInfo.inviteId = action.payload
    },
    setPrivateId: (state, action: PayloadAction<string>) => {
      state.shareInfo.privateId = action.payload
    },
    setRoomId: (state, action: PayloadAction<string>) => {
      state.shareInfo.roomId = action.payload
    },
    setShareInfo: (state, action: PayloadAction<ShareInfo>) => {
      state.shareInfo = action.payload
    }
  }
})

export const { setMode, setTitle, setInviteId, setPrivateId, setRoomId, setShareInfo } = sliceReducer.actions
export default sliceReducer.reducer
