import React, { useEffect } from "react";
import ToolButton from "./ToolButton";
import {BsArrowRight, BsArrowsMove, BsPen, BsEraser, BsCursor} from 'react-icons/bs'
import {AiOutlineLine} from 'react-icons/ai'
import {IoSquareOutline} from 'react-icons/io5'
import {RxCircle} from 'react-icons/rx'
import Persister from "../../lib/Persister";
import store from "../../store/store";
import ShareBar from "../ShareBar";
import Settings from "../settings/Settings";
import Hr from "../../base/components/Hr";
import { useParams } from "react-router";
import IsOwned from "../../lib/isAuthor";


export default function ToolPanel(){
    const { roomId } = useParams()
    const isAuthor = IsOwned(roomId)
    useEffect( () => {
        new Persister(store, 'toolSettings')
    }, [] )

    return (
        <div className="d-flex align-items-center flex-column">
                <ToolButton name="move">
                    <BsArrowsMove />
                </ToolButton>
                {
                    isAuthor && (
                    <>
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
                    </>
                    )
                }
                <Hr />
                {isAuthor && <ShareBar />}
                <Settings />
            </div>
    )
}