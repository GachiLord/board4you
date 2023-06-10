const path = require('path')

module.exports = function(args){
    for (const arg of args){
        if (typeof arg !== 'string') continue

        const ext = path.extname(arg).slice(1)
        if (['png', 'pdf', 'zip'].includes(ext)) return arg
    } 
    return null
}