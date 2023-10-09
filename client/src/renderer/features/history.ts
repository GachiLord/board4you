import { createSlice } from '@reduxjs/toolkit'
import { Edit } from '../lib/EditManager'
import { PayloadAction } from '@reduxjs/toolkit'


export interface IHistoryState{
  current: Edit[], // actions that have been taken
  undone: Edit[], // actions that have been undone (UNDO)
}
const initialState: IHistoryState = {
  current: [], // actions that have been taken
  undone: [], // actions that have been undone (UNDO)
}


export const historySlice = createSlice({
  name: 'history',
  initialState: initialState,
  reducers: {
    addCurrent: (state, action: PayloadAction<Edit>) => {
      state.current.push(action.payload)
    },
    addUndone: (state, action: PayloadAction<Edit>) => {
      state.undone.push(action.payload)
    },
    removeCurrent: (state, action: PayloadAction<string>) => {
      const editIndex = state.current.findLastIndex(e => e.id === action.payload)
      if (!editIndex) return

      state.current.splice(editIndex, 1)
    },
    removeUndone: (state, action: PayloadAction<string>) => {
      const editIndex = state.current.findLastIndex(e => e.id === action.payload)
      if (!editIndex) return

      state.undone.splice(editIndex, 1)
    },
    emptyUndone: state => {
      state.undone = []
    },
    emptyCurrent: state => {
      state.current = []
    },
    emptyHistory: state => { 
      state.current = []
      state.undone = []  
    },
    undo: (state, action?: PayloadAction<string>) => {
      const lastIndex: number = action.payload ? state.current.findLastIndex( e => e.id === action.payload ) : state.current.length - 1
      const last = state.current[lastIndex]
      if (!last) return
      state.current.splice(lastIndex, 1)
      state.undone.push(last)
    },
    redo: (state, action?: PayloadAction<string>) => {
      const lastIndex: number = action.payload ? state.undone.findLastIndex( e => e.id === action.payload ) : state.undone.length - 1
      const last = state.undone[lastIndex]
      if (!last) return
      state.undone.splice(lastIndex, 1)
      state.current.push(last)
    }
  }
})

// Action creators are generated for each case reducer function
export const { addCurrent, addUndone, emptyHistory, emptyUndone, emptyCurrent, undo, redo, removeCurrent, removeUndone } = historySlice.actions

export default historySlice.reducer