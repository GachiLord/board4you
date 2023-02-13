import React, { Component } from "react";
import ToolButton from "./ToolButton";
import {BsArrowRight, BsArrowsMove, BsPen, BsEraser} from 'react-icons/bs'
import {AiOutlineLine} from 'react-icons/ai'
import {IoSquareOutline} from 'react-icons/io5'
import {RxGroup, RxCircle} from 'react-icons/rx'


export default class ToolPanel extends Component{

    constructor(props){
        super(props);
        this.state = {activeTool: props.tool}
    }

    handleModeChange = (id) => {
        this.setState({activeTool: id})
        this.props.onModeChange(id)
    }

    render = () => {

        return (
            <div className="d-flex align-items-center flex-column">
                <ToolButton 
                    id="move"
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    handleAttrChange={this.props.handleAttrChange}
                    >
                    <BsArrowsMove />
                </ToolButton>
                <ToolButton 
                    id="select" 
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool}
                    >
                    <RxGroup />
                </ToolButton>
                <ToolButton 
                    id="pen" 
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    customize
                    handleAttrChange={this.props.handleAttrChange}
                    >
                    <BsPen />
                </ToolButton>
                <ToolButton 
                    id="line" 
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    customize
                    handleAttrChange={this.props.handleAttrChange}
                    >
                    <AiOutlineLine />
                </ToolButton>
                <ToolButton 
                    id="arrow" 
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    customize
                    handleAttrChange={this.props.handleAttrChange}
                    >
                    <BsArrowRight />
                </ToolButton>
                <ToolButton 
                    id="rect" 
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    customize
                    handleAttrChange={this.props.handleAttrChange}
                    >
                    <IoSquareOutline />
                </ToolButton>
                <ToolButton
                    id="ellipse"
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    customize
                    handleAttrChange={this.props.handleAttrChange}
                >
                    <RxCircle />
                </ToolButton>
                <ToolButton 
                    id="eraser" 
                    onModeChange={this.handleModeChange} 
                    active={this.state.activeTool} 
                    customize
                    handleAttrChange={this.props.handleAttrChange}
                    hideColorPicker
                    hideLineTypePicker
                    >
                    <BsEraser />
                </ToolButton>
            </div>
        )
    }
}