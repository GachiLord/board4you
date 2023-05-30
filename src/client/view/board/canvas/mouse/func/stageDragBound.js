export default function(pos){
    return {
        x: this.absolutePosition().x,
        y: pos.y < 0 ? pos.y: 0
      };
}