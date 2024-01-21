import jsPDF from "jspdf"
import store from "../store/store"
import ISize from "../base/typing/ISize";
import * as pdfjsLib from 'pdfjs-dist'
import { start, stop, update } from "../features/progress";



export default class ImageUtils {

  static getSizeOfBase64Img = (uri: string): Promise<ISize> => {
    return new Promise((resolve) => {
      const element = new Image()
      element.onload = function() {
        const size = { height: element.height, width: element.width }
        element.remove()
        resolve(size)
      }
      element.src = uri
    })
  }

  static base64ToBlob = async (base64: string) => {
    return await fetch(base64)
  }

  static async base64ToImage(base64: string) {
    return new Promise(resolve => {
      const image = new Image()
      image.onload = function() {
        resolve(image)
      }
      image.src = base64
    })
  }

  static pdfToBase64imgs = async (path: string) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './public/pdf.worker.js'
    const doc = await pdfjsLib.getDocument({ url: path }).promise
    const imgs = []
    const pagesWidth = []
    const pagesHeight = []

    // create loading modal
    store.dispatch(start({ current: 1, last: doc.numPages }))

    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      const viewport = p.getViewport({ scale: 1 })

      canvas.width = viewport.width
      canvas.height = viewport.height

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const renderTask = await p.render({
        canvasContext: context,
        viewport: viewport
      }).promise

      imgs.push(canvas.toDataURL())
      canvas.remove()

      pagesWidth.push(viewport.width)
      pagesHeight.push(viewport.height)
      p.cleanup()
      // update page
      store.dispatch(update(i))
    }

    // clear memory and remove the worker
    doc.destroy()
    // stop loading
    store.dispatch(stop())

    return { imgs: imgs, size: { width: Math.max(...pagesWidth), height: Math.max(...pagesHeight) } }
  }

  static async base64imgsToPdfObject(imgs: string[]) {
    const stage = store.getState().stage
    const size = [stage.width, stage.baseHeight]
    const doc = new jsPDF({
      orientation: 'l',
      format: size
    })
    imgs = await imgs

    imgs.forEach((item, index) => {
      doc.addImage(item, 'PNG', 0, 0, stage.width, stage.baseHeight)
      if (index < imgs.length - 1) doc.addPage(size, 'l')
    })
    return doc
  }

  static async urlToImage(url: string) {
    return new Promise((res, rej) => {
      const img = new Image()

      img.onerror = function() {
        rej('Cannot load image')
      };
      img.onload = function() {
        res(img);
      };
      img.src = url;
    })
  }
}
