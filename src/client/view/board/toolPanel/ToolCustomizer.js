import React, { Component } from "react";
import { CirclePicker, HuePicker } from 'react-color'
import RangeSlider from 'react-bootstrap-range-slider';
import { Form, Row, Col } from "react-bootstrap";
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';


export default class ToolCustomizer extends Component{

    constructor(props){
        super(props)
        this.closeAreaStyle = {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
        }
        this.state = props.custom
    }

    onChangeLineType = (e) => {
        const v = e.target.value
        this.setState({lineType: v})
    }

    onChangeSize = (e) => {
        const v = Number(e.target.value)
        this.setState({lineSize: v})
    }

    onChangeColor = (c) => {
        c = c.hex
        this.setState({lineColor: c})
    }

    handleClose = () => this.props.onClose(this.state)

    render = () => {
        const style = {
            'marginLeft': '30pt',
            'zIndex': 3,
            'minWidth': '300pt',
        }
        const defaultColors = [
            "#000000", "#f44336", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
             "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39",
              "#e91e63", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"
        ]
        const closeArea = {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
        }
        const labelStyle = {
            'wordWrap': 'normal'
        }
        const locCfg = window.global.localizationCfg


        return (
            <>
                {this.props.open && (
                    <div className="zindex-fixed position-absolute" style={style}>
                    <div style={closeArea} onClick={this.handleClose}></div>

                    <div className="card p-4 position-absolute">
                        <Form>
                            {!this.props.hideColorPicker && (
                                <>
                                <div>
                                    <CirclePicker className="mb-2" color={this.state.lineColor} onChange={this.onChangeColor} colors={defaultColors}/>
                                    <HuePicker className="mb-2" color={this.state.lineColor} onChange={this.onChangeColor} width="100%"/>
                                </div>
                                
                                </>
                            )}

                            {
                                !this.props.hideSizePicker && (
                                    <>
                                        <Form.Group as={Row}>
                                            <Form.Label column sm="4" style={labelStyle}>
                                            {locCfg.size}
                                            </Form.Label>
                                            <Col sm="8">
                                            <RangeSlider
                                                min={2}
                                                max={100}
                                                value={this.state.lineSize}
                                                onChange={this.onChangeSize}
                                                tooltip='auto'
                                            />
                                            </Col>
                                        </Form.Group>

                                        
                                    </>
                                )
                            }
                            
                            {
                                !this.props.hideLineTypePicker && (
                                    <>
                                        <Form.Group as={Row}>
                                            <Form.Label column sm="4"  style={labelStyle}>
                                            {locCfg.line}
                                            </Form.Label>
                                            <Col sm="8">
                                            <Form.Select onChange={this.onChangeLineType} value={this.state.lineType}>
                                                <option value='general'>{locCfg.solid}</option>
                                                <option value='dashed'>{locCfg.dashed}</option>
                                            </Form.Select>
                                            </Col>
                                        </Form.Group>
                                    </>
                                )
                            }
                            
                        </Form>
                    </div>

                    </div>
                )}
            </>
        )
    }
}