import { dialog } from 'electron'
import fs from 'fs'
import imgToPDF from './imageToPdf'
import AdmZip from "adm-zip"
import getCanvasSize from '../common/getCanvasSize'



/**
 * `FileManager` contains several static methods for working with files, such as opening
 * files as base64 images, getting the file extension, and saving base64 files. * 
 */
export default class FileManager{

    /**
     * `static async openFilesAsBase64Images()` is a static method of the `FileManager` class that opens a dialog box to select
     * files with extensions of `pdf`, `png`, or `zip`. It returns a promise that resolves to an object containing an array of
     * base64-encoded images, the path of the selected file, and the file extension. If the dialog is canceled, it returns
     * nothing.
     * 
     * @async
     * @method
     * @name openFilesAsBase64Images
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @returns {Promise<{ base64: string[]; path: string; type: 'pdf'|'png'|'zip'; }>}
     */
    static async openFilesAsBase64Images(){
        const dialogResult = await dialog.showOpenDialog(globalThis.appWindow, { 
            properties: ['openFile'],
            filters: [
                { name: 'pdf, png, zip', extensions: ['pdf', 'png', 'zip'] }
            ]
        })
        if (dialogResult.canceled) return

        const path = dialogResult.filePaths[0]
        return FileManager.getFileAsBase64Imgs(path)
    }

    /**
     * `static getFileAsBase64Imgs(path)` is a static method of the `FileManager` class that takes a file path as an argument
     * and returns an object containing an array of base64-encoded images, the path of the selected file, and the file
     * extension. It also removes any duplicate images from the array.
     * 
     * @method
     * @name getFileAsBase64Imgs
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string} path
     * @returns {{ base64: string[]; path: string; type: 'pdf'|'png'|'zip'; }}
     */
    static getFileAsBase64Imgs(path: string){
        let extention = FileManager.getFileExtension(path)
        let base64Files = []
        
        if (extention === 'zip'){
            const zip = new AdmZip(path)
            zip.getEntries().forEach(e => {
                base64Files.push(FileManager.getFullBase64(zip.readFile(e).toString('base64')))
            })
            extention = 'png'
        }
        else base64Files.push(FileManager.getBase64ofFile(path))
        
        // remove empty pages
        base64Files = new Array(...new Set(base64Files))

        return {base64: base64Files, path: path, type: extention}
    }

    /**
     * `static getFileExtension(filePath)` is a static method of the `FileManager` class that takes a file path as an argument
     * and returns the file extension of the file.
     * 
     * @method
     * @name getFileExtension
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string} filePath
     * @returns {string}
     */
    static getFileExtension(filePath: string) {
        const extention = filePath.split('.')
        return extention.length > 1 ? extention.at(-1): 'zip'
    }

    /**
     * `static getBase64ofFile(file)` is a static method of the `FileManager` class that takes a file path as an argument and
     * returns a base64-encoded string of the file.
     * 
     * @method
     * @name getBase64ofFile
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string} path
     * @returns {string}
     */
    static getBase64ofFile(path: string){
        switch(this.getFileExtension(path)){
            case 'png':
                return "data:image/png;base64,"+fs.readFileSync(path, 'base64');
            case 'pdf':
                return "pdfData:pdf;base64,"+fs.readFileSync(path, 'base64');
        }
        
    }

    /**
     * `static getFullBase64(base64Value)` is a static method of the `FileManager` class that takes a base64-encoded string as
     * an argument and returns a new base64-encoded string with the prefix `data:image/png;base64,`. This method is used to
     * ensure that the base64-encoded string is in the correct format for displaying images in the application.
     * 
     * @method
     * @name getFullBase64
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string} base64Value
     * @returns {string}
     */
    static getFullBase64(base64Value: string) { return "data:image/png;base64," + base64Value }

    /**
     * `static getOnlyBase64Value(base64)` is a static method of the `FileManager` class that takes a base64-encoded string as
     * an argument and returns a new string with the prefix `data:.*base64,` removed. This method is used to extract only the
     * base64-encoded value from a string that contains additional information such as the data type and encoding.
     * 
     * @method
     * @name getOnlyBase64Value
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string} base64
     * @returns {string}
     */
    static getOnlyBase64Value(base64: string){
        return base64.replace(/data:.*base64,/, '')
    }

    /**
     * `static async saveBase64(base64files, filePath)` is a static method of the `FileManager` class that takes an array of
     * base64-encoded images and a file path as arguments. It saves the base64-encoded images as either a PDF or a ZIP file at
     * the specified file path.
     * 
     * @async
     * @method
     * @name saveBase64
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string[]} base64files
     * @param {string} filePath
     * @returns {Promise<string>}
     */
    static async saveBase64(base64files: string[], filePath: string) {
        const canvasSize = getCanvasSize()
        // file and info
        const extention = FileManager.getFileExtension(filePath)
        const uniqueBase64Files = new Array(...new Set(base64files))
        // create stream and promise for finish evt
        const fsStream = fs.createWriteStream(filePath)
        const finish: Promise<string> = new Promise( (resolve, reject) => {
            fsStream.on('finish', () => resolve(filePath) )
            fsStream.on('drain', () => resolve(filePath) )
            fsStream.on('error', (e) =>  reject(e) )
        } )


        if (extention === 'pdf') imgToPDF(uniqueBase64Files, [canvasSize.width, canvasSize.height]).pipe(fsStream)
        else {
            const zip = new AdmZip()
            uniqueBase64Files.forEach( (base64, i) => {
                base64 = FileManager.getOnlyBase64Value(base64)
                zip.addFile(`lesson${i+1}.png`, Buffer.from(base64, 'base64'))
            } )
            fsStream.write(zip.toBuffer())
        }
        
        // waiting for file saving
        return await finish
    }

    /**
     * `static async saveBase64As(base64file)` is a static method of the `FileManager` class that opens a dialog box to save a
     * base64-encoded file as either a PDF or a ZIP file. It returns a promise that resolves to the file path of the saved
     * file.
     * 
     * @async
     * @method
     * @name saveBase64As
     * @kind method
     * @memberof <unknown>.FileManager
     * @static
     * @param {string} base64file
     * @returns {Promise<string>}
     */
    static async saveBase64As(base64file: string[]) {
        const pathDialog = await dialog.showSaveDialog(globalThis.appWindow, {
            title: globalThis.localizationCfg.savePdfOrZip,
            defaultPath: 'lesson.pdf',
            properties: ['showOverwriteConfirmation', 'createDirectory']
          
        })
        if (pathDialog.canceled) return

        return await FileManager.saveBase64(base64file, pathDialog.filePath)
    }
     
}