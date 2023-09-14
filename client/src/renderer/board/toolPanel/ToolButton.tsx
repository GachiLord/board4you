import React, { useState } from "react"
import { ToolName } from "../../base/typing/ToolName"
import IconWrap from "./IconWrap"
import { animated, useSpring } from "@react-spring/web"
import ToolCustomizer from "./ToolCustomizer"
import baseIconStyle from "../../base/style/baseIconStyle"
import { useSelector } from "react-redux"
import { RootState } from "../../store/store"
import { set as setTool } from "../../features/tool"
import { useDispatch } from "react-redux"


interface props{
    children: any,
    name: ToolName, 
    customizable?: boolean, 
    hideColorPicker?: boolean,
    hideSizePicker?: boolean,
    hideLineTypePicker?: boolean
}
export default function(props: props){
    const dispatch = useDispatch()
    const [isOpen, setOpen] = useState(false)
    const toolIsActive = useSelector((state: RootState) => state.tool.active) === props.name
    const AnimatedIcon = animated(IconWrap)
    const animFrames = { start: {size: '2em'}, end: {size: '2.2em'} }
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
        if (props.customizable && toolIsActive) setOpen(!isOpen)
        else if(!toolIsActive) dispatch(setTool(props.name))
        anim()
    }


    let iconClass = "m-2" + (toolIsActive ? " text-primary": "")
    let value = {className: iconClass, ...baseIconStyle}

    return (
        <div className="zindex-fixed">
            <AnimatedIcon style={{...value, ...spring}} onClick={handleClick}>
                {props.children}
            </AnimatedIcon>
            <ToolCustomizer
                open={isOpen}
                close={ () => setOpen(false) }
                hideColorPicker={props.hideColorPicker}
                hideSizePicker={props.hideSizePicker}
                hideLineTypePicker={props.hideLineTypePicker}
            />
        </div>
    )
}