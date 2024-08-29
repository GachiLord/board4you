import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import Persister from "../lib/Persister";
import { ToolName } from "../base/typing/ToolName";
import { LineType } from "../lib/protocol/protocol";


// load or use default settings
export interface IToolSetting {
  lineColor?: string,
  lineType?: LineType,
  lineSize?: number,
}

export interface IToolSettings {
  'pen': IToolSetting,
  'line': IToolSetting,
  'arrow': IToolSetting,
  'rect': IToolSetting,
  'ellipse': IToolSetting,
  'eraser': IToolSetting,
  'move': IToolSetting,
  'select': IToolSetting,
  'img': IToolSetting
}

export type ToolSettingName = 'lineColor' | 'lineType' | 'lineSize'
export type lineType = 'general' | 'dashed'

const defaultSetting: IToolSetting = {
  lineColor: '#000000',
  lineType: LineType.General,
  lineSize: 2,
}
const defaultSettings: IToolSettings = Persister.load('toolSettings', {
  'pen': defaultSetting,
  'line': defaultSetting,
  'arrow': defaultSetting,
  'rect': defaultSetting,
  'ellipse': defaultSetting,
  'eraser': { ...defaultSetting, lineSize: 20 },
  'move': defaultSetting,
  'select': defaultSetting,
  'img': defaultSetting
})


// create slice
const toolSettingsSlice = createSlice({
  name: 'toolSettings',
  initialState: defaultSettings,
  reducers: {
    setToolSetting: (state, action: PayloadAction<{ tool: ToolName, setting: IToolSetting }>) => {
      state[action.payload.tool] = { ...state[action.payload.tool], ...action.payload.setting }
    }
  }
})

export const { setToolSetting } = toolSettingsSlice.actions
export default toolSettingsSlice.reducer
