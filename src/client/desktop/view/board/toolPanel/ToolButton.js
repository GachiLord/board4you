import React, { useState } from "react";
import baseIconStyle from "../../base/baseIconStyle";
import ToolCustomizer from "./ToolCustomizer";
import IconWrap from "./IconWrap";
import { useSpring, animated } from "@react-spring/web";


export default function(props){

    const [state, setState] = useState({
        customizerIsOpen: false,
        custom: {
            lineColor: props.lineColor ? props.lineColor: '#000000',
            lineType: props.lineType ? props.lineType: 'general',
            lineSize: props.lineSize ? props.lineSize: 2,
        }
    })

    const animFrames = {
        start: {
            size: '2em',
        },
        end: {
            size: '2.2em',
        }
    }

    const [spring, api] = useSpring( () => ({ from: animFrames.start }) )

    const anim = () => {
        api.start({
            from: animFrames.start,
            to: animFrames.end,
            config: {duration: 500}
        })
        api.start({
            from: animFrames.end,
            to: animFrames.start,
            config: {duration: 100}
        })
    }

    const handleClick = () => {
        const toolCustomizeble = props.customize
        const toolActiveAndCustomizeble = toolIsActive() && props.customize
        const customizerIsOpen = state.customizerIsOpen
 
        if( toolActiveAndCustomizeble && !customizerIsOpen) setState({customizerIsOpen: true})
        else if (toolActiveAndCustomizeble && customizerIsOpen) setState({customizerIsOpen: false})
        else {
            anim()
            props.onModeChange(props.id)
            if (toolCustomizeble) props.handleAttrChange(state.custom)
        }
    }

    const handleOpenClose = (custom) => {
        setState(state => {
            return {customizerIsOpen: !state.customizerIsOpen}
        })
        props.handleAttrChange(custom)
        setState({custom: custom})
    }

    const toolIsActive = () => props.active === props.id
    const AnimatedIcon = animated(IconWrap)

    let iconClass = "m-2" + (toolIsActive() ? " text-primary": "")
    let value = {className: iconClass, ...baseIconStyle}

    return (
        <div className="zindex-fixed">
            <AnimatedIcon style={{...value, ...spring}} onClick={handleClick}>
                {props.children}
            </AnimatedIcon>
            <ToolCustomizer
                open={state.customizerIsOpen}
                handleAttrChange={props.handleAttrChange}
                onClose={handleOpenClose}
                hideColorPicker={props.hideColorPicker}
                hideSizePicker={props.hideSizePicker}
                hideLineTypePicker={props.hideLineTypePicker}
                custom={state.custom}
            />
        </div>
    )
}