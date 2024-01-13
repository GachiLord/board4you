import React from "react";
import Drawer from "./canvas/Drawer";
import ToolPanel from "./toolPanel/ToolPanel";
import UndoRedoBar from "./undoRedoBar/UndoRedoBar"
import SizeDialog from "./SizeDialog";
import PageBar from "./PageBar";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import BoardManagerContext from '../base/constants/BoardManagerContext'
import BoardManager from "../lib/BoardManager/BoardManager";
import { itemIn } from "../lib/twiks";


const boardManager = new BoardManager()

export default function Editor() {
  const mode = useSelector((state: RootState) => state.board.mode)
  const currentTool = useSelector((state: RootState) => state.tool.active)
  const toolSettings = useSelector((state: RootState) => state.toolSettings)
  const panelStyle = { zIndex: 3 }
  const barBlockStyle = { ...panelStyle }
  const drawerStyle = { 'margin': '5px 0 0 120px' }


  return (
    <BoardManagerContext.Provider value={boardManager}>
      <div className="d-flex">
        <div className="position-fixed h-75 d-flex flex-column justify-content-around m-4" style={panelStyle}>
          <PageBar />
          <ToolPanel />
          <div className="d-inline-block" style={barBlockStyle}>
            {itemIn(mode, 'local', 'coop', 'author') && <div><UndoRedoBar /></div>}
          </div>
        </div>
        <div style={drawerStyle}>
          <Drawer
            tool={currentTool}
            color={toolSettings[currentTool].lineColor}
            lineType={toolSettings[currentTool].lineType}
            lineSize={toolSettings[currentTool].lineSize}
          />
        </div>
        <SizeDialog />
      </div>
    </BoardManagerContext.Provider>
  )
}
