module.exports = function(path, defaultTittle = 'board4you'){
    if (path) return path.split('/').at(-1)
    return defaultTittle
}