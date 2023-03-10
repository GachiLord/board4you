import React from "react";
import {IconContext} from "react-icons";

export default function (props){
    return (
        <IconContext.Provider value={props.style}>
            <div onClick={props.onClick}>
                {props.children}
            </div>
        </IconContext.Provider>
    )
}