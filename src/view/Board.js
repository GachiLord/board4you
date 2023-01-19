import React from "react";
import Canvas from "./board/Canvas";
import ToolPanel from "./board/ToolPanel";


export default class Board extends React.Component{

    constructor(props){
        super(props)

        this.state = {
            mode:'pen',
            lineColor: 'black',
            lineType: 'general',
            lineSize: 2
        }
    }


    handleModeChange = (newMode) => {
        this.setState({mode:newMode});
    }

    handleAttrChange = (attrs) => {
        this.setState(state => {
            return {
                ...state.mode,
                ...attrs
            }
        })
    }

    render = () => {
        const panelStyle = {zIndex: 3}

        return (
            <div>
                <div className="position-fixed h-75 d-flex align-items-center m-4" style={panelStyle}>
                    <ToolPanel
                        onModeChange={this.handleModeChange} 
                        handleAttrChange={this.handleAttrChange}
                        tool={this.state.mode}
                    />
                </div>
                <div className="m-2">
                    <Canvas
                        tool={this.state.mode}
                        color={this.state.lineColor}
                        lineType={this.state.lineType}
                        lineSize={this.state.lineSize}
                    />
                </div>
            </div>
        )
    }
}