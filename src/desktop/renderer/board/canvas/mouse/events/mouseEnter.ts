import { KonvaEventObject } from "konva/lib/Node";
import { IDrawerProps } from "../../Drawer";
import { getStage } from "../../../../lib/twiks";
import { setCursorForTool } from "../func/cursor";

export default function(e: KonvaEventObject<MouseEvent>, props: IDrawerProps){
    const stage = getStage(e)

    setCursorForTool(stage, props.tool)
}