import getAppTittle from "../../../../src/desktop/common/getAppTittle";


test('should work with link when "/" at the end', () => {
    expect(getAppTittle('https://duckduckgo.com/')).toBe('duckduckgo.com')
})

test('should work with link', () => {
    expect(getAppTittle('https://duckduckgo.com')).toBe('duckduckgo.com')
})

test('should work with unix path when "/" at the end', () => {
    expect(getAppTittle('/src/desktop/common/getAppTittle.ts/')).toBe('getAppTittle.ts')
})

test('should work with unix path', () => {
    expect(getAppTittle('/src/desktop/common/getAppTittle.ts')).toBe('getAppTittle.ts')
})

test('should work with win path when "\\" at the end', () => {
    expect(getAppTittle('\\src\\desktop\\common\\getAppTittle.ts\\')).toBe('getAppTittle.ts')
})

test('should work with win path', () => {
    expect(getAppTittle('\\src\\desktop\\common\\getAppTittle.ts')).toBe('getAppTittle.ts')
})

test('should return default tittle when empty string', () => {
    expect(getAppTittle('')).toBe('board4you')
})

test('should return default tittle when string = "/"', () => {
    expect(getAppTittle('/')).toBe('board4you')
})

