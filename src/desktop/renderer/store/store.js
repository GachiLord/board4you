import { configureStore } from '@reduxjs/toolkit'
import historyReducer from '../features/history'
import stageReducer from '../features/stage'
import selectReducer from '../features/select'


export default configureStore({
  reducer: {
    'history': historyReducer,
    'stage': stageReducer,
    'select': selectReducer,
  }
})