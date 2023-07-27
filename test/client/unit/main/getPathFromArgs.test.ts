import getPathFromArgs from "../../../../src/desktop/main/getPathFromArgs";


test('should return null if there is no document path in args', () => {
    expect(getPathFromArgs(process.argv)).toBeNull()
})

test('should throw error if args !== string[]', () => {
    expect(() => {getPathFromArgs([1.2])}).toThrow()
})

test('should return path if there is a document in args on UNIX', () => {
    const filePath = '/home/oleg/Рабочий стол/lesson.pdf'
    const args = [filePath].concat(process.argv)

    expect(getPathFromArgs(args)).toBe(filePath)
})

test('should return path if there is a document in args on WIN', () => {
    const filePath = '\\home\\oleg\\Рабочий стол\\lesson.pdf'
    const args = [filePath].concat(process.argv)

    expect(getPathFromArgs(args)).toBe(filePath)
})