import getPathFromArgs from "../../../../src/main/getPathFromArgs";
import { test, describe } from "node:test"
import assert from "node:assert"


describe("getPathFromArgs", () => {
    test('should return null if there is no document path in args', () => {
        assert.equal(getPathFromArgs(process.argv), null)
    })
    
    test('should not throw error if args !== string[]', () => {
        assert.doesNotThrow(() => {getPathFromArgs([1.2])})
    })
    
    test('should return path if there is a document in args on UNIX', () => {
        const filePath = '/home/oleg/Рабочий стол/lesson.pdf'
        const args = [filePath].concat(process.argv)
    
        assert.equal(getPathFromArgs(args), filePath)
    })
    
    test('should return path if there is a document in args on WIN', () => {
        const filePath = '\\home\\oleg\\Рабочий стол\\lesson.pdf'
        const args = [filePath].concat(process.argv)
    
        assert.equal(getPathFromArgs(args), filePath)
    })
})