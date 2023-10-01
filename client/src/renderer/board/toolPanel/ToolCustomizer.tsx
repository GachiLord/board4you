import React, { useContext } from "react"
import { LocaleContext } from "../../base/constants/LocaleContext"
import { CSSProperties } from "react"
import { CirclePicker, HuePicker } from 'react-color'
import RangeSlider from 'react-bootstrap-range-slider';
import { Form, Row, Col } from "react-bootstrap";
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { setToolSetting } from "../../features/toolSettings";
import { ColorResult } from "react-color";
import { RootState } from "../../store/store";



export default function ToolCustomizer(props: any){
    const common: { style: CSSProperties, defaultColors: string[], closeArea: CSSProperties, labelStyle: CSSProperties, locCfg: any } = {
        style: {
            'marginLeft': '30pt',
            'zIndex': 3,
            'minWidth': '300pt',
        },
        defaultColors: [
            "#000000", "#f44336", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3",
            "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a", "#cddc39",
            "#e91e63", "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"
        ],
        closeArea: {
            position: 'fixed',
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px',
        },
        labelStyle: {
            'wordWrap': 'normal'
        },
        locCfg: useContext(LocaleContext)
    }
    const tool = useSelector((state: RootState) => state.tool.active)
    const state = useSelector((state: RootState) => state.toolSettings[tool])
    const dispatch = useDispatch()


    const onChangeLineType = (e: any) => {
        const v = e.target.value
        dispatch( setToolSetting({tool: tool, setting: {lineType: v}} )
        )
     }

    const onChangeSize = (_: any, value: number) => {
        const v = Number(value)
        dispatch( setToolSetting({tool: tool, setting: {lineSize: v}} )
        )
    }

    const onChangeColor = (result: ColorResult) => {
        const c = result.hex
        dispatch( setToolSetting({tool: tool, setting: {lineColor: c}}) )
    }


    return (
        <>
            {props.open && (
                <div className="zindex-fixed position-absolute" style={common.style}>
                <div style={common.closeArea} onClick={props.close}></div>
                <div className="card p-4 position-absolute">
                    <Form>
                        {!props.hideColorPicker && (
                            <div>
                                <CirclePicker className="mb-2" color={state.lineColor} onChange={onChangeColor} colors={common.defaultColors}/>
                                <HuePicker className="mb-2" color={state.lineColor} onChange={onChangeColor} width="100%"/>
                            </div>  
                            )}
                        {
                            !props.hideSizePicker && (
                                <Form.Group as={Row}>
                                    <Form.Label column sm="4" style={common.labelStyle}>
                                    {common.locCfg.size}
                                    </Form.Label>
                                    <Col sm="8">
                                    <RangeSlider
                                        min={2}
                                        max={100}
                                        value={state.lineSize}
                                        onChange={onChangeSize}
                                        tooltip='auto'
                                    />
                                    </Col>
                                </Form.Group>    
                                )
                        } 
                        {
                            !props.hideLineTypePicker && (
                                <Form.Group as={Row}>
                                    <Form.Label column sm="4" style={common.labelStyle}>
                                    {common.locCfg.line}
                                    </Form.Label>
                                    <Col sm="8">
                                    <Form.Select onChange={onChangeLineType} value={state.lineType}>
                                        <option value='general'>{common.locCfg.solid}</option>
                                        <option value='dashed'>{common.locCfg.dashed}</option>
                                    </Form.Select>
                                    </Col>
                                </Form.Group>
                            )
                        }    
                    </Form>
                </div>
                </div>
                )}
            </>
    )
}