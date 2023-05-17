export default function(){
    let selectRect = this.state.temporaryShapes.selectRect
    selectRect.x += 2
    selectRect.y += 2 - Math.abs(this.state.stagePos.y)
    selectRect.height -= 4
    selectRect.width -= 4
    navigator.clipboard.write([
        new ClipboardItem({
            'image/png': this.stage.current.toBlob(selectRect)
        })
    ]);    
}