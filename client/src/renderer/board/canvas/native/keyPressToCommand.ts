export default function keyPressToCommand(e: KeyboardEvent): string|undefined{
    const key = e.code
    const crtl = e.ctrlKey
    
    if (key === 'KeyL' && crtl) return 'selectSize'
    if (key === 'KeyZ' && crtl) return 'undo'
    if (key === 'KeyY' && crtl) return 'redo'
    if (key === 'Delete') return 'del'
}