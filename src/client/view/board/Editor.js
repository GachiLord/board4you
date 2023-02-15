import React, {useState} from "react";
import Drawer from "./canvas/Drawer";
import ToolPanel from "./toolPanel/ToolPanel";
import UndoRedoBar from "./undoRedoBar/UndoRedoBar"
import useLocalStorageState from 'use-local-storage-state'


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
    const undoBarStyle = {...panelStyle, 'bottom': '0'}

    return (
        <div>
            <div className="position-fixed h-75 d-flex align-items-center m-4" style={panelStyle}>
                <ToolPanel
                    onModeChange={handleModeChange} 
                    handleAttrChange={handleAttrChange}
                    tool={currentTool}
                    defaultSettings={toolSettings}
                />
            </div>
            <div className="position-fixed d-flex align-items-center m-4" style={undoBarStyle}>
                <UndoRedoBar />
            </div>
            <div className="m-2">
                <Drawer
                    tool={currentTool}
                    color={toolSettings[currentTool].lineColor}
                    lineType={toolSettings[currentTool].lineType}
                    lineSize={toolSettings[currentTool].lineSize}
                />
            </div>
        </div>
    )    
}