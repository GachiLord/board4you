export default function(layer){
    layer.children.forEach(shape => {
        if (!shape.isVisible()) shape.show()
    })
}