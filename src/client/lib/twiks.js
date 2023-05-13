
export function run(f, g = () => console.warn('electronApi is not found')){
    if (window.electronAPI){
        f()
    }
    else g()
}