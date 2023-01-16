const { dialog } = require('electron')
const fs = require('fs')
const imgToPDF = require('image-to-pdf')
var AdmZip = require("adm-zip");


module.exports = class ElectronFileManager{

    static async openFilesAsBase64Images(){
        const dialogResult = await dialog.showOpenDialog({ 
            properties: ['openFile'],
            filters: [
                { name: 'pdf, png, zip', extensions: ['pdf', 'png', 'zip'] }
            ]
        })
        if (dialogResult.canceled) return

        const path = dialogResult.filePaths[0]
        let extention = ElectronFileManager.getFileExtension(path)
        let base64Files = new Set()


        if (extention === 'zip') {
            let zip = new AdmZip(path)
            zip.getEntries().forEach(e => {
                base64Files.add(ElectronFileManager.getFullBase64(zip.readFile(e).toString('base64')))
            })
            extention = 'png'
        }
        else base64Files.add(ElectronFileManager.getBase64ofFile(path))


        return {base64: [...base64Files], path: dialogResult.filePaths[0], type: extention}
    }

    

    static getFileExtension(filePath) {
        let extention = filePath.split('.')
        return extention.length > 1 ? extention.at(-1): 'zip'
    }

    static getBase64ofFile(file){
        return "data:image/png;base64,"+fs.readFileSync(file, 'base64');
    }

    static getFullBase64(base64Value) { return "data:image/png;base64," + base64Value }

    static getOnlyBase64Value(base64){
        return base64.replace(/data:.*base64,/, '')
    }

    static async saveBase64(base64files, filePath) {
        let extention = ElectronFileManager.getFileExtension(filePath)
        let uniqueBase64Files = new Set(base64files)

        if (extention === 'pdf') imgToPDF([...uniqueBase64Files], [1720, 900]).pipe(fs.createWriteStream(filePath))
        else {
            let zip = new AdmZip()
            base64files.forEach( (base64, i) => {
                base64 = ElectronFileManager.getOnlyBase64Value(base64)
                zip.addFile(`lesson${i+1}.png`, Buffer.from(base64, 'base64'))
            } )
            zip.writeZip(filePath)
        }
        
        return filePath
    }

    static async saveBase64As(base64file) {
        const pathDialog = await dialog.showSaveDialog({
            title: 'Сохранить pdf или zip',
            defaultPath: 'lesson.pdf',
            properties: ['showOverwriteConfirmation', 'createDirectory']
          
        })
        if (pathDialog.canceled) return

        return ElectronFileManager.saveBase64(base64file, pathDialog.filePath)
    }
     
}