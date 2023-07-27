const path = require('path')

/**
 * function takes an array of strings as an argument. The function checks each string
 * in the array to see if it has a file extension of either "png", "pdf", or "zip". If it finds a string with one of those
 * extensions, it returns that string. If it doesn't find any strings with those extensions, it returns null.
 * 
 */
module.exports = function(args){
    for (const arg of args){
        if (typeof arg !== 'string') continue

        const ext = path.extname(arg).slice(1)
        if (['png', 'pdf', 'zip'].includes(ext)) return arg
    } 
    return null
}