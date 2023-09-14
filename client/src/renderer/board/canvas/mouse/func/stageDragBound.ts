import { ICoor } from "../../../../base/typing/ICoor";

export default function(pos: ICoor){
    return {
        x: this.absolutePosition().x,
        y: pos.y < 0 ? pos.y: 0
      };
}