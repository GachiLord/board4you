import React from 'react';
import baseIconStyle from '../base/baseIconStyle';
import { SwatchesPicker } from 'react-color';
import {BsPalette} from 'react-icons/bs';
import { IconContext } from "react-icons";


export default class PaletteButton extends React.Component{

    constructor(props){
        super(props)
        this.state = {color: 'black', paletteIsVisible: false}
    }

    handleChange = (color) => {
        color = color.hex
        this.setState({color: color})
        this.props.onColorChange(color)
        
    }

    handleOpen = () => { this.setState({paletteIsVisible: !this.state.paletteIsVisible}) } 

    handleClose = () => { this.setState({paletteIsVisible: false}) }

    render = () => {
        let iconstyle = {fontSize: baseIconStyle.fontSize,
             color: this.state.color, size: baseIconStyle.size,
             verticalAlign: baseIconStyle.verticalAlign,
             className:'m-2'}
        let closeArea = {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
        }

        return (
            <div className='zindex-fixed'>
                <IconContext.Provider value={iconstyle}>
                    <BsPalette onClick={this.handleOpen}/>
                    {this.state.paletteIsVisible && (
                        <>
                        <div style={closeArea} onClick={this.handleClose}></div>
                        <SwatchesPicker onChange={this.handleChange} className='position-absolute' width={550}/>
                        </>
                        )}
                </IconContext.Provider>
            </div>
        )
    }
}