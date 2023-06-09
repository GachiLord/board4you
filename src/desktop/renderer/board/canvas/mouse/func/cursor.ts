import { Stage } from "konva/lib/Stage"
import { ToolName } from "../../../../base/typing/ToolName"


export const setCursor = (stage: Stage, style: CSSStyleDeclaration['cursor'] = 'default') => {
    stage.container().style.cursor = style
}

export const setCursorForTool = (stage: Stage, tool: ToolName) => {
    switch(tool){
        case 'move':
            setCursor(stage, 'move')
            break
        case 'select':
            setCursor(stage, 'crosshair')
            break
        case 'rect':
            setCursor(stage, 'crosshair')
            break
        default:
            setCursor(stage)
            break
    }
}