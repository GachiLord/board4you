import React, { Component } from "react";
import {IconContext} from "react-icons";
import baseIconStyle from "../base/baseIconStyle";
import ToolCustomizer from "./ToolCustomizer";

export default class ToolButton extends Component{

    constructor(props){
        super(props)
        this.baseIconStyle = baseIconStyle
        this.state = {
            customizerIsOpen: false,
            custom: {
                lineColor: props.lineColor ? props.lineColor: '#000000',
                lineType: props.lineType ? props.lineType: 'general',
                lineSize: props.lineSize ? props.lineSize: 2,
            }
        }
    }

    handleClick = () => {
        const toolCustomizeble = this.props.customize
        const toolActiveAndCustomizeble = this.toolIsActive() && this.props.customize
        const customizerIsOpen = this.state.customizerIsOpen
 
        if( toolActiveAndCustomizeble && !customizerIsOpen) this.setState({customizerIsOpen: true})
        else if (toolActiveAndCustomizeble && customizerIsOpen) this.setState({customizerIsOpen: false})
        else {
            this.props.onModeChange(this.props.id)
            if (toolCustomizeble) this.props.handleAttrChange(this.state.custom)
        }
    }

    handleOpenClose = (custom) => {
        this.setState(state => {
            return {customizerIsOpen: !state.customizerIsOpen}
        })
        this.props.handleAttrChange(custom)
        this.setState({custom: custom})
    }

    toolIsActive = () => this.props.active === this.props.id

    render = () => {
        let iconClass = "m-2" + (this.toolIsActive() ? " text-primary": "")
        let value = {className: iconClass, ...this.baseIconStyle}

        return (
            <div className="zindex-fixed">
                <IconContext.Provider value={value}>
                    <div onClick={this.handleClick}>
                        {this.props.children}
                    </div>
                </IconContext.Provider>
                <ToolCustomizer 
                    open={this.state.customizerIsOpen}
                    handleAttrChange={this.props.handleAttrChange}
                    onClose={this.handleOpenClose}
                    hideColorPicker={this.props.hideColorPicker}
                    hideSizePicker={this.props.hideSizePicker}
                    hideLineTypePicker={this.props.hideLineTypePicker}
                    custom={this.state.custom}
                />
            </div>
        )
    }
}