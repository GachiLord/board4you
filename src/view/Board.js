import React from "react";
import Canvas from "./board/Canvas";
import ToolPanel from "./board/ToolPanel";


export default class Board extends React.Component{

    constructor(props){
        super(props)

        this.state = {mode:'move', color: 'black'}
    }


    handleModeChange = (newMode) => {
        this.setState({mode:newMode});
    }

    handleColorChange = (color) => { this.setState({color: color}) }

    render = () => {
        const panelStyle = {zIndex: 3}

        return (
            <div>
                    <div className="position-fixed h-75 d-flex align-items-center m-4" style={panelStyle}>
                        <ToolPanel
                            onModeChange={this.handleModeChange} 
                            onColorChange={this.handleColorChange} 
                            tool={this.state.mode}/>
                    </div>
                    <div className="m-2">
                        <Canvas tool={this.state.mode} color={this.state.color}/>
                    </div>
            </div>
        )
    }
}