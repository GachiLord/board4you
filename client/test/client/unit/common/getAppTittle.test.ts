import getAppTittle from "../../../../src/common/getAppTittle";
import path from 'node:path'


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

test('should work like path.basename()', () => {
    const testCase = '/src/desktop/common/getAppTittle.ts'

    expect(getAppTittle(testCase)).toBe(path.basename(testCase))
})

