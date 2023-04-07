const { width } = require("../constants/CommonCanvasSize")

module.exports = function(){
    let exp = {height: 920, width: 1720}

    if (globalThis.window) {
        if (localStorage.getItem('CanvasSize')){
            exp = JSON.parse(localStorage.getItem('CanvasSize'))
        }
    }
    else if (globalThis.CanvasSize) exp = globalThis.CanvasSize

    exp.height = Number(exp.height)
    exp.width = Number(exp.width)

    return exp
}