import React, { useEffect } from "react";
import ToolButton from "./ToolButton";
import {BsArrowRight, BsArrowsMove, BsPen, BsEraser, BsCursor} from 'react-icons/bs'
import {AiOutlineLine} from 'react-icons/ai'
import {IoSquareOutline} from 'react-icons/io5'
import {RxCircle} from 'react-icons/rx'
import Persister from "../../lib/Persister";
import store from "../../store/store";


export default function(){
    useEffect( () => {
        new Persister(store, 'toolSettings')
    }, [] )

    return (
        <div className="d-flex align-items-center flex-column">
                <ToolButton name="move">
                    <BsArrowsMove />
                </ToolButton>
                <ToolButton name="select">
                    <BsCursor />
                </ToolButton>
                <ToolButton name="pen" customizable>
                    <BsPen />
                </ToolButton>
                <ToolButton name="line" customizable>
                    <AiOutlineLine />
                </ToolButton>
                <ToolButton name="arrow" customizable>
                    <BsArrowRight />
                </ToolButton>
                <ToolButton name="rect" customizable>
                    <IoSquareOutline />
                </ToolButton>
                <ToolButton name="ellipse" customizable>
                    <RxCircle />
                </ToolButton>
                <ToolButton 
                    name="eraser"
                    customizable
                    hideColorPicker
                    hideLineTypePicker
                >
                    <BsEraser />
                </ToolButton>
            </div>
    )
}