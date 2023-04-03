import React, {useState} from "react";
import Drawer from "./canvas/Drawer";
import ToolPanel from "./toolPanel/ToolPanel";
import UndoRedoBar from "./undoRedoBar/UndoRedoBar"
import useLocalStorageState from 'use-local-storage-state'
import SizeDialog from "./SizeDialog";


export default function(props){

    const [currentTool, setTool] = useState('pen')
    const defaultSetting = {
        lineColor: '#000000',
        lineType: 'general',
        lineSize: 2,
    }
    const [toolSettings, setToolSettings] = useLocalStorageState('toolSettings', {
        defaultValue: {
            'pen': defaultSetting,
            'line': defaultSetting,
            'arrow': defaultSetting,
            'rect': defaultSetting,
            'ellipse': defaultSetting,
            'eraser': {...defaultSetting, lineSize: 20},
            // plug for error bypassing
            'move': defaultSetting,
            'select': defaultSetting,
        }
    })

    const handleModeChange = (tool) => {
        setTool(tool);
    }

    const handleAttrChange = (tool, attrs) => {
        let settings = toolSettings
        settings[tool] = attrs
        setToolSettings(settings)
    }


    const panelStyle = {zIndex: 3}
    const undoBarStyle = {...panelStyle}

    return (
        <>
        <div className="d-flex align-items-center">
            <div className="h-75 d-flex flex-column justify-content-around m-4" style={panelStyle}>
                <ToolPanel
                    onModeChange={handleModeChange} 
                    handleAttrChange={handleAttrChange}
                    tool={currentTool}
                    defaultSettings={toolSettings}
                />
                <div className="mt-5 d-inline-block" style={undoBarStyle}>
                    <UndoRedoBar />
                </div>
            </div>
            <div className="m-2">
                <Drawer
                    tool={currentTool}
                    color={toolSettings[currentTool].lineColor}
                    lineType={toolSettings[currentTool].lineType}
                    lineSize={toolSettings[currentTool].lineSize}
                />
            </div>
            <SizeDialog />
        </div>
        </>
    )    
}