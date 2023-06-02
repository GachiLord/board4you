import { createSlice } from '@reduxjs/toolkit'


export const historySlice = createSlice({
  name: 'history',
  initialState: {
    current: [], // actions that have been taken
    undone: [], // actions that have been undone (UNDO)
  },
  reducers: {
    addCurrent: (state, action) => {
      state.current.push(action.payload)
    },
    addUndone: (state, action) => {
      state.undone.push(action.payload)
    },
    modifyCurrent: (state, action) => {
      state.current[action.payload.id] = action.payload.item
    },
    modifyLastCurrent: (state, action) => {
      state.current[state.current.length - 1] = action.payload
    },
    modifyLastUndone: (state, action) => {
      state.undone[state.undone.length - 1] = action.payload
    },
    modifyUndone: (state, action) => {
      state.undone[action.payload.id] = action.payload.item
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
    undo: state => {
      const last = state.current.at(-1)
      state.current.pop()
      state.undone.push(last)
    },
    redo: state => {
      const last = state.undone.at(-1)
      state.undone.pop()
      state.current.push(last)
    }
  }
})

// Action creators are generated for each case reducer function
export const { addCurrent, addUndone, modifyCurrent, modifyUndone, emptyHistory,
  modifyLastCurrent, modifyLastUndone, emptyUndone, emptyCurrent, undo, redo } = historySlice.actions

export default historySlice.reducer