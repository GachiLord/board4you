/**
 * This function returns current canvas size. It works in nodejs and browser.
 * If there is no saved size it returns default one
 * 
 * @name getCanvasSize
 * @returns {{height: number, width: number}}
 */
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