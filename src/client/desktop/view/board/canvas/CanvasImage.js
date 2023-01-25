import useImage from "use-image";
import React from "react";
import { Image } from "react-konva";


export default function CanvasImage(props){
    const [image] = useImage(props.url)
    return <Image
                image={image}
                x={props.x} 
                y={props.y} 
                width={props.width} 
                height={props.height} 
                shapeId={props.shapeId}
                globalCompositeOperation='destination-over'
                applyCache
                applyHitFromCache
            />
}