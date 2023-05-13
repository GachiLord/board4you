export default function(){
    const tool = this.props.tool
    const setCursor = this.setCursor

    switch(tool){
        case 'move':
            setCursor('move')
            break
        case 'select':
            setCursor('crosshair')
            break
        case 'rect':
            setCursor('crosshair')
            break
        default:
            setCursor()
            break
    }    
}