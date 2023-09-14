import CanvasUtils from "../../../../../src/renderer/lib/CanvasUtils";
import LineFactory from "../../../../../src/renderer/lib/NodeFactories/LineFactory";


test('should convert connected field from Array to Set', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]
    const shape = CanvasUtils.toShape(shapeObj)

    const konvaObject = CanvasUtils.toKonvaObject(shape)
    
    expect(konvaObject.attrs.connected).toStrictEqual(new Set(shape.connected))
})

test('should return same fields as in shape', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]
    const shape = CanvasUtils.toShape(shapeObj)

    const konvaObject = CanvasUtils.toKonvaObject(shape)
    konvaObject.setAttr('connected', [...konvaObject.attrs.connected])
    
    expect(konvaObject.attrs).toMatchObject(shape)
})