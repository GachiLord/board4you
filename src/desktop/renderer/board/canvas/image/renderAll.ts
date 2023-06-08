import Konva from "konva"

export default function(layer: Konva.Layer){
    layer.children.forEach(shape => {
        if (!shape.isVisible()) shape.show()
    })
}