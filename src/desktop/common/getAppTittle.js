module.exports = function(path, defaultTittle = 'board4you'){
    if (path) return path.split(/\/|\\/gm).at(-1)
    return defaultTittle
}