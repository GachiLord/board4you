import React, { useEffect } from "react";
import BoardManager from "../lib/BoardManager";
import ReconnectingWebSocket from "reconnecting-websocket";


export default function(){
    useEffect( () => {
        const board = new ReconnectingWebSocket(`ws://${location.host}/board`)

        board.addEventListener('open', _ => {
            board.addEventListener('message', (e) => {
                console.log(e.data)
            })
            board.send(JSON.stringify(
                { Join: {room_id: 'b4e4d4f3-5be1-42b3-ee7-2f54678d84e1'} }
            ))
        })
        
    }, [] )


    return "viewer"
}

function onMessage(msg: any){
    console.log(msg)
}

function onConnect(e: any){

}