import React, { Component } from "react";
import ToolButton from "./ToolButton";
import PaletteButton from "./PaletteButton";
import {BsArrowRight, BsArrowsMove, BsPen, BsEraser} from 'react-icons/bs'
import {AiOutlineLine} from 'react-icons/ai'
import {AiOutlineSmallDash} from 'react-icons/ai'
import {IoSquareOutline} from 'react-icons/io5'
import {RxGroup} from 'react-icons/rx'


export default class ToolPanel extends Component{

    constructor(props){
        super(props);
        this.state = {activeTool: props.tool, activeColor: 'black'}
    }

    handleModeChange = (id) => {
        this.setState({activeTool: id})
        this.props.onModeChange(id)
    }

    handleColorChange = (color) => {
        this.setState({color: color})
        this.props.onColorChange(color)
    }

    render = () => {

        return (
            <div className="d-flex align-items-center flex-column">
                <ToolButton id="move" onModeChange={this.handleModeChange} active={this.state.activeTool}><BsArrowsMove /></ToolButton>
                <ToolButton id="select" onModeChange={this.handleModeChange} active={this.state.activeTool}><RxGroup /></ToolButton>
                <ToolButton id="pen" onModeChange={this.handleModeChange} active={this.state.activeTool}><BsPen /></ToolButton>
                <PaletteButton onColorChange={this.handleColorChange}/>
                <ToolButton id="line" onModeChange={this.handleModeChange} active={this.state.activeTool}><AiOutlineLine /></ToolButton>
                <ToolButton id="dashed line" onModeChange={this.handleModeChange} active={this.state.activeTool}><AiOutlineSmallDash /></ToolButton>
                <ToolButton id="arrow" onModeChange={this.handleModeChange} active={this.state.activeTool}><BsArrowRight /></ToolButton>
                <ToolButton id="rect" onModeChange={this.handleModeChange} active={this.state.activeTool}><IoSquareOutline /></ToolButton>
                <ToolButton id="eraser" onModeChange={this.handleModeChange} active={this.state.activeTool}><BsEraser /></ToolButton>
            </div>
        )
    }
}