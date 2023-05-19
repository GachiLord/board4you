import React, { useRef, useEffect } from "react";
import { mouseDown, mouseMove, mouseUp, mouseLeave } from './mouse/';
import { useSelector } from "react-redux";
import { Layer, Stage } from 'react-konva';
import Generator from "../../../lib/Generator";



export default function(props){
    const stage = useRef(null)
    // define redux reducers
    const stageState = useSelector(state => state.stage)

    return (
        <div className="d-flex justify-content-center">
            <Stage
                ref={stage}
                height={stageState.height}
                width={stageState.width}
                className="border"
                onMouseDown={(e) => mouseDown(e, props)}
                onMouseMove={(e) => mouseMove(e, props)}
                onMouseUp={(e) => mouseUp(e, props)}
                onMouseLeave={(e) => mouseLeave(e, props)}
            >
                <Layer/>
                <Layer></Layer>
            </Stage>
        </div>
    )
}