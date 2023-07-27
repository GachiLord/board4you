import CanvasUtils from "../../../../../src/desktop/renderer/lib/CanvasUtils";
import LineFactory from "../../../../../src/desktop/renderer/lib/NodeFactories/LineFactory";


test('should not return undefined fields', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    shapeObj.setAttr('undefinedField', undefined)
    const shape = CanvasUtils.toShape(shapeObj)

    expect(shape).not.toContain(undefined)
})

test('should return same fields as in shapeObj', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    const shape = CanvasUtils.toShape(shapeObj)
    // convert connected to array to run test
    shapeObj.setAttr('connected', [...shape.connected])
    
    expect(shapeObj.attrs).toMatchObject(shape)
})

test('should convert connected field from Set to Array', () => {
    const factory = new LineFactory()
    const shapeObj = factory.create(1)[0]

    const shape = CanvasUtils.toShape(shapeObj)
    
    expect(shapeObj.attrs.connected).toStrictEqual(new Set(shape.connected))
})