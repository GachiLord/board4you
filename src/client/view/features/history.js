import { createSlice } from '@reduxjs/toolkit'

export const historySlice = createSlice({
  name: 'history',
  initialState: {
    currentHistory: [], // full history
    historyActions: [], // actions that have been taken
    canceledHistoryActions: [], // actions that have been undone (UNDO)
  },
  reducers: {
    addAction: (state, action) => {
      state.historyActions.push(action.payload ? action.payload: {action: 'add last'})
    },
    modifyAction: (state, action) => {
      state.historyActions[action.payload.id] = action.payload.action
    },
    addItem: (state, action) => {
      state.currentHistory.push(action.payload)
      state.historyActions.push({action: 'add last'})
    },
    modifyItem: (state, action) => {
      state.currentHistory[action.payload.id] = action.payload.item
    },
    undo: state => {
      const lastAction = this.state.historyActions.at(-1)

      if (lastAction){
        state.historyActions = state.historyActions.slice(0,-1),
        state.canceledHistoryActions = [...state.canceledHistoryActions, lastAction]
        state.currentHistory = CanvasUtils.getHistoryAcActions(state.currentHistory, state.historyActions)
      }
    },
    redo: state => {
      const lastAction = this.state.canceledHistoryActions.at(-1)

      if (lastAction){
        historyActions = [...state.historyActions, lastAction],
        canceledHistoryActions = state.canceledHistoryActions.slice(0,-1)
        state.currentHistory = CanvasUtils.getHistoryAcActions(state.currentHistory, state.historyActions)
      }
    },
    acceptChanges: state => {
      const historyWithChanges = CanvasUtils.getHistoryAcActions(state.currentHistory, state.historyActions)

      state.canceledHistoryActions = []
      state.historyActions = historyWithChanges.map( () => {return {action: 'add last'}} )
      state.currentHistory = historyWithChanges
    },
    clearUndone: state => { state.canceledHistoryActions = [] },
    setHistory: (state, action) => {
      state = action.payload
    }
  }
})

// Action creators are generated for each case reducer function
export const { addAction, modifyAction, addItem, modifyItem, undo, redo, acceptChanges, setHistory, clearUndone } = historySlice.actions

export default historySlice.reducer