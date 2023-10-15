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
    // none disables tool changing. It is useful when you just need to have an animated icon
    name: ToolName|'none'|'none-active', 
    customizable?: boolean, 
    hideColorPicker?: boolean,
    hideSizePicker?: boolean,
    hideLineTypePicker?: boolean
    // custom class for active
    activatedClass?: string,
    notActivetedClass?: string,
}
export default function ToolButton(props: props){
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
        // dont handle tool change if name is none
        const isNone = props.name === 'none' || props.name === 'none-active'
        if (props.customizable && toolIsActive && !isNone) setOpen(!isOpen)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: Unreachable code error
        else if(!toolIsActive && !isNone) dispatch(setTool(props.name))
        anim()
    }

    // set primary color if name is none-active
    const iconClass = `m-2 ${(toolIsActive || props.name === 'none-active') ? props.activatedClass ?? "text-primary": props.notActivetedClass ?? ""}`
    const value = {className: iconClass, ...baseIconStyle}

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