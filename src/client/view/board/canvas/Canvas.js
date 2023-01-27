import React from "react"
import CanvasImage from './CanvasImage';
import { Stage, Layer, Line, Arrow, Rect } from 'react-konva';


export default React.forwardRef((props, ref) => {
    const history = props.history
    const temporaryShapes = props.temporaryShapes
    const pageLinesY = props.pageLinesY

    
    return (
        <div className="d-flex justify-content-center">
            <Stage
                ref={ref}
                className="border"
                width={props.width}
                height={props.height}
                onMouseDown={props.onStageMouseDown && props.onStageMouseDown}
                onMouseMove={props.onStageMouseMove && props.onStageMouseMove}
                onMouseup={props.onStageMouseup && props.onStageMouseup}
                onMouseLeave={props.onStageMouseLeave && props.onStageMouseLeave}
                onMouseEnter={props.onStageMouseEnter && props.onStageMouseEnter}
                x={props.stagePos.x}
                y={props.stagePos.y}
                >
                {
                    (props.renderOutOfViewElements) && (
                        <Layer listening={false}>
                            <Rect
                                    x={0}
                                    y={0}
                                    width={props.width}
                                    height={props.height + props.baseHeight}
                                    shadowForStrokeEnabled={false}
                                    key='background'
                                    fill='white'
                                    globalCompositeOperation='source-over'
                                />
                        </Layer>
                    )
                }
                
                <Layer listening={false}>
                    {history.map((shape) => {
                        switch (shape.type) {
                            case 'arrow':
                                return (
                                    <Arrow
                                        y={shape.pos.y}
                                        x={shape.pos.x}
                                        shapeId={shape.shapeId}
                                        key={shape.shapeId}
                                        points={shape.points}
                                        stroke={shape.color}
                                        fill={shape.color}
                                        strokeWidth={shape.lineSize}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                        hitStrokeWidth={25}
                                        shadowForStrokeEnabled={false}
                                        globalCompositeOperation= 'source-over'
                                        tool={shape.tool}
                                        dash={shape.lineType === 'general' ? []: [10, 10]}
                                    />
                                )
                        
                            case 'img':
                                return (
                                    <CanvasImage
                                        shapeId={shape.shapeId}
                                        url={shape.url}
                                        x={shape.pos.x}
                                        y={shape.pos.y}
                                        width={shape.width}
                                        height={shape.height}
                                        key={shape.shapeId}
                                        tool={shape.tool}
                                    />
                                )
                            case 'rect':
                                return (
                                    <Rect
                                        x={shape.pos.x}
                                        y={shape.pos.y}
                                        width={shape.width}
                                        height={shape.height}
                                        stroke={shape.color}
                                        strokeWidth={shape.lineSize}
                                        shadowForStrokeEnabled={false}
                                        shapeId={shape.shapeId}
                                        key={shape.shapeId}
                                        globalCompositeOperation='source-over'
                                        tool={shape.tool}
                                        dash={shape.lineType === 'general' ? []: [10, 10]}
                                    />
                                )
                            case 'line':
                                return (
                                    <Line
                                        pos={shape.pos}
                                        y={shape.pos.y}
                                        x={shape.pos.x}
                                        shapeId={shape.shapeId}
                                        key={shape.shapeId}
                                        points={shape.points}
                                        stroke={shape.color}
                                        strokeWidth={shape.lineSize}
                                        dash={shape.lineType === 'general' ? []: [10, 10]}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                        hitStrokeWidth={25}
                                        shadowForStrokeEnabled={false}
                                        globalCompositeOperation={shape.tool === 'eraser' ? 'destination-out' : 'source-over'}
                                        tool={shape.tool}
                                    />)
                        }
                    }      
                )}           
                </Layer>
                <Layer>
                {
                    (temporaryShapes.selectRect !== undefined) &&
                        (
                            <Rect
                                x={temporaryShapes.selectRect.x}
                                y={temporaryShapes.selectRect.y}
                                width={temporaryShapes.selectRect.width}
                                height={temporaryShapes.selectRect.height}
                                stroke='blue'
                                strokeWidth={2}
                                opacity={0.5}
                                dash={[20, 10]}
                                id='selectRect'
                                onDragStart={props.onSelectDragStart}
                                onDragEnd={props.onSelectDragEnd}
                                onDragMove={props.onSelectDragMove}
                                onMouseEnter={props.onSelectMouseEnter}
                                onMouseLeave={props.onSelectMouseLeave}
                                shadowForStrokeEnabled={false}
                                draggable
                            />
                        )
                }
                {
                    pageLinesY.map( (y) => {
                        return (<Line
                                    key={y}
                                    points={[0, y, props.width, y]}
                                    stroke={'black'}
                                    strokeWidth={2}
                                    tension={0.5}
                                    lineCap="round"
                                    lineJoin="round"
                                    hitStrokeWidth={25}
                                    globalCompositeOperation={'source-over'}
                                    dash={[20, 10]}
                                    opacity={0.2}
                                    shadowForStrokeEnabled={false}
                                />)
                    } )
                    }
                </Layer>
            </Stage>
        </div>
    )
})
