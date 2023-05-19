import { configureStore } from '@reduxjs/toolkit'
import historyReducer from '../features/history'
import stageReducer from '../features/stage'


export default configureStore({
  reducer: {
    'history': historyReducer,
    'stage': stageReducer,
  }
})