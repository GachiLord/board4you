const path = require('path')

module.exports = function(args){
    for (const arg of args){
        if (typeof arg !== 'string') throw new TypeError('args must be string[]')

        const ext = path.extname(arg).slice(1)
        if (['png', 'pdf', 'zip'].includes(ext)) return arg
    } 
    return null
}