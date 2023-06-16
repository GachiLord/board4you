import CanvasUtils from "../../../../../src/desktop/renderer/lib/CanvasUtils";


test('should return empty object if there are no possible fields', () => {
    const fields = { a: 0, b: 0 }

    const retrived = CanvasUtils.retrivePossibleFields(fields)

    expect(retrived).toStrictEqual({})
})

test('should return object if there are possible fields', () => {
    const fields = { height: 10, width: 423, shapeId: '4321' }

    const retrived = CanvasUtils.retrivePossibleFields(fields)

    expect(retrived).toStrictEqual(fields)
})

test('should return object if there are possible and impossible fields', () => {
    const fields = { height: 10, 'impossible field': true }

    const retrived = CanvasUtils.retrivePossibleFields(fields)

    expect(retrived).toStrictEqual({height: 10})
})

test('should convert connected field from Set to Array', () => {
    const fields = { height: 10, connected: new Set(['123','234','345']) }

    const retrived = CanvasUtils.retrivePossibleFields(fields)

    expect(retrived).toStrictEqual({height: 10, connected: ['123','234','345']})
})