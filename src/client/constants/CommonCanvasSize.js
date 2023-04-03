let exp = {height: 920, width: 1720}

if (globalThis.window) if (localStorage.getItem('CanvasSize')){
    exp = localStorage.getItem('CanvasSize')
}
else if (globalThis.CanvasSize) exp = globalThis.CanvasSize

module.exports = exp
