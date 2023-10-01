import { configureStore } from '@reduxjs/toolkit'
import historyReducer from '../features/history'
import stageReducer from '../features/stage'
import selectReducer from '../features/select'
import toolSettingsReducer from '../features/toolSettings'
import toolReducer from '../features/tool'
import progressReducer from '../features/progress'
import boardReducer from '../features/board' 
import roomsReducer from '../features/rooms'


const store = configureStore({
  reducer: {
    'history': historyReducer,
    'stage': stageReducer,
    'select': selectReducer,
    'toolSettings': toolSettingsReducer,
    'tool': toolReducer,
    'progress': progressReducer,
    'board': boardReducer,
    'rooms': roomsReducer
  }
})

export default store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch