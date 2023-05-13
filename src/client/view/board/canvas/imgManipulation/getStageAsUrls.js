export default function(){
    flushSync( () => this.setState({renderOutOfViewElements: true}) )
    const stagePos = this.state.stagePos
    const width = this.state.width
    const lastY = CanvasUtils.getLastY(this.getCurrentHistoryAcActions())

    let urls = []
    for (let y = stagePos.y; y <= lastY - Math.abs(stagePos.y); y += this.state.baseHeight){
        if (y >= lastY - 5) break
        urls.push(
            this.stage.current.toDataURL({
                x: stagePos.x,
                y: y,
                width: width,
                height: this.state.baseHeight,
            })
        )
    }

    flushSync( () => this.setState({renderOutOfViewElements: false}) )
    return urls    
}