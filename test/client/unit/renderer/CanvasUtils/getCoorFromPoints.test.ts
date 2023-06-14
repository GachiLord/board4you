import CanvasUtils from "../../../../../src/desktop/renderer/lib/CanvasUtils";


test('should return points when length > 2 and coor is y', () => {
    const points = [22,33,44,777,11,21]

    const coor = CanvasUtils.getCoorFromPoints(points, 'y')

    expect(coor).toStrictEqual([33,777,21])
})

test('should return points when length > 2 and coor is x', () => {
    const points = [22,33,44,777,11,21]

    const coor = CanvasUtils.getCoorFromPoints(points, 'x')

    expect(coor).toStrictEqual([22,44,11])
})

test('should return points when length > 2 and coor is x', () => {
    const points = [22,33,44,777,11,21]

    const coor = CanvasUtils.getCoorFromPoints(points, 'x')

    expect(coor).toStrictEqual([22,44,11])
})

test('should return point when length == 2 and coor is y', () => {
    const points = [1,2]

    expect(CanvasUtils.getCoorFromPoints(points, 'y')).toStrictEqual([2])
})

test('should return point when length == 2 and coor is x', () => {
    const points = [1,2]

    expect(CanvasUtils.getCoorFromPoints(points, 'x')).toStrictEqual([1])
})

test('should return [] when length == 1 and coor is y', () => {
    const points = [1]

    expect(CanvasUtils.getCoorFromPoints(points, 'y')).toStrictEqual([])
})

test('should return [] when length == 0', () => {
    const points: number[] = []

    expect(CanvasUtils.getCoorFromPoints(points, 'y')).toStrictEqual([])
})