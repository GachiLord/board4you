module.exports = function(){
    let exp = {height: 920, width: 1720}

    if (globalThis.window) {
        if (localStorage.getItem('CanvasSize')){
            try{
                exp = JSON.parse(localStorage.getItem('CanvasSize'))
            }
            catch{}
        }
    }
    else if (globalThis.CanvasSize) exp = globalThis.CanvasSize

    exp.height = Number(exp.height)
    exp.width = Number(exp.width)


    if (exp.height === 0) exp.height = 920
    if (exp.width === 0) exp.width = 1720

    return exp
}