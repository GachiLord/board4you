import getAppTittle from "../../../src/common/getAppTittle";
import path from 'node:path'
import { test, describe } from "node:test"
import assert from "node:assert"

describe('unit/common/getAppTittle', () => {
    test('should work with link when "/" at the end', () => {
        assert.equal(getAppTittle('https://duckduckgo.com/'), 'duckduckgo.com')
    })
    
    test('should work with link', () => {
        assert.equal(getAppTittle('https://duckduckgo.com'), 'duckduckgo.com')
    })
    
    test('should work with unix path when "/" at the end', () => {
        assert.equal(getAppTittle('/src/desktop/common/getAppTittle.ts/'), 'getAppTittle.ts')
    })
    
    test('should work with unix path', () => {
        assert.equal(getAppTittle('/src/desktop/common/getAppTittle.ts'), 'getAppTittle.ts')
    })
    
    test('should work with win path when "\\" at the end', () => {
        assert.equal(getAppTittle('\\src\\desktop\\common\\getAppTittle.ts\\'), 'getAppTittle.ts')
    })
    
    test('should work with win path', () => {
        assert.equal(getAppTittle('\\src\\desktop\\common\\getAppTittle.ts'), 'getAppTittle.ts')
    })
    
    test('should return default tittle when empty string', () => {
        assert.equal(getAppTittle(''), 'board4you')
    })
    
    test('should return default tittle when string = "/"', () => {
        assert.equal(getAppTittle('/'), 'board4you')
    })
    
    test('should work like path.basename()', () => {
        const testCase = '/src/desktop/common/getAppTittle.ts'
    
        assert.equal(getAppTittle(testCase), path.basename(testCase))
    })
} )

