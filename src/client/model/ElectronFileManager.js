const { dialog } = require('electron')
const fs = require('fs')
const imgToPDF = require('image-to-pdf')
const AdmZip = require("adm-zip")
const getCanvasSize = require('./CommonGetCanvasSize')


module.exports = class ElectronFileManager{

    static async openFilesAsBase64Images(){
        const dialogResult = await dialog.showOpenDialog(globalThis.appWindow, { 
            properties: ['openFile'],
            filters: [
                { name: 'pdf, png, zip', extensions: ['pdf', 'png', 'zip'] }
            ]
        })
        if (dialogResult.canceled) return

        const path = dialogResult.filePaths[0]
        let extention = ElectronFileManager.getFileExtension(path)
        let base64Files = []

        
        if (extention === 'zip'){
            let zip = new AdmZip(path)
            zip.getEntries().forEach(e => {
                base64Files.push(ElectronFileManager.getFullBase64(zip.readFile(e).toString('base64')))
            })
            extention = 'png'
        }
        else base64Files.push(ElectronFileManager.getBase64ofFile(path))
        
        // remove empty pages
        base64Files = new Array(...new Set(base64Files))

        return {base64: base64Files, path: path, type: extention}
    }

    

    static getFileExtension(filePath) {
        let extention = filePath.split('.')
        return extention.length > 1 ? extention.at(-1): 'zip'
    }

    static getBase64ofFile(file){
        switch(this.getFileExtension(file)){
            case 'png':
                return "data:image/png;base64,"+fs.readFileSync(file, 'base64');
            case 'pdf':
                return "pdfData:pdf;base64,"+fs.readFileSync(file, 'base64');
        }
        
    }

    static getFullBase64(base64Value) { return "data:image/png;base64," + base64Value }

    static getOnlyBase64Value(base64){
        return base64.replace(/data:.*base64,/, '')
    }

    static async saveBase64(base64files, filePath) {
        const canvasSize = getCanvasSize()
        // file and info
        let extention = ElectronFileManager.getFileExtension(filePath)
        let uniqueBase64Files = new Array(...new Set(base64files))
        // create stream and promise for finish evt
        const fsStream = fs.createWriteStream(filePath)
        const finish = new Promise( (resolve, reject) => {
            fsStream.on('finish', () => resolve(filePath) )
            fsStream.on('error', (e) =>  reject(e) )
        } )


        if (extention === 'pdf') imgToPDF(uniqueBase64Files, [canvasSize.width, canvasSize.height]).pipe(fsStream)
        else {
            let zip = new AdmZip()
            uniqueBase64Files.forEach( (base64, i) => {
                base64 = ElectronFileManager.getOnlyBase64Value(base64)
                zip.addFile(`lesson${i+1}.png`, Buffer.from(base64, 'base64'))
            } )
            fs.writeFile(filePath, zip.toBuffer(),  "binary", function(err) { console.log(err) })
        }
        
        // waiting for file saving
        if (extention === 'pdf'){
            return await finish
        }
        else{
            return filePath
        }
    }

    static async saveBase64As(base64file) {
        const pathDialog = await dialog.showSaveDialog(globalThis.appWindow, {
            title: globalThis.localizationCfg.savePdfOrZip,
            defaultPath: 'lesson.pdf',
            properties: ['showOverwriteConfirmation', 'createDirectory']
          
        })
        if (pathDialog.canceled) return

        return await ElectronFileManager.saveBase64(base64file, pathDialog.filePath)
    }
     
}