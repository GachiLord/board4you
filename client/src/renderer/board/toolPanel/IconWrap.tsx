import React from "react";
import {IconContext} from "react-icons";

export default function IconWrap(props: any){
    return (
        <IconContext.Provider value={props.style}>
            <div onClick={props.onClick}>
                {props.children}
            </div>
        </IconContext.Provider>
    )
}