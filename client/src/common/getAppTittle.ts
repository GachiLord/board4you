/**
 * This function returns current file or page name
 * 
 * @name getAppTittle
 * @param {string} path
 * @returns {string}
 */
export default function(path?: unknown, defaultTittle = 'board4you'){
    if (typeof path === 'string'){
        const parsed = path.split(/\/|\\/gm)

        if (parsed.at(-1).trim() !== '') return parsed.at(-1)
        else if (parsed.at(-2) && parsed.at(-2).trim() !== '' ) return parsed.at(-2)
        else return defaultTittle
    }
    return defaultTittle
}