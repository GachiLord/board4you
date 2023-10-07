export default function keyPressToCommand(e: KeyboardEvent): string|undefined{
    const key = e.code
    const shift = e.shiftKey
    const crtl = e.ctrlKey
    
    if (key === 'KeyL' && crtl && shift) return 'selectSize'
    if (key === 'KeyZ' && crtl) return 'undo'
    if (key === 'KeyY' && crtl) return 'redo'
    if (key === 'Delete') return 'del'
}