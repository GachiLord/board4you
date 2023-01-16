import React, { Component } from "react";
import {IconContext} from "react-icons";
import baseIconStyle from "../base/baseIconStyle";

export default class ToolButton extends Component{

    constructor(props){
        super(props)
        this.baseIconStyle = baseIconStyle
    }

    handleClick = () => {
        this.props.onModeChange(this.props.id)
    }

    render = () => {
        let iconClass = "m-2" + (this.props.active === this.props.id ? " text-primary": "")
        let value = {className: iconClass, ...this.baseIconStyle}

        return (
            <IconContext.Provider value={value}>
                <div onClick={this.handleClick}>
                    {this.props.children}
                </div>
            </IconContext.Provider>
        )
    }
}