// import CanvasUtils from "./CanvasUtils"
// import { v4 as uuid4 } from "uuid"


// export default class Generator{
//     constructor(dimensions){
//         this.height = dimensions.height
//         this.width = dimensions.width
//     }

//     #getRandomCoors(amount = 2){
//         let coors = []
        
//         for (let i = 0; i < amount; i++){
//             coors.push(Math.random() * this.width, Math.random() * this.height)
//         }

//         return coors
//     }

//     getRandomLinesObjects(amount = 1, length = 50){
//         let lines = []

//         for (let i = 0; i < amount; i++){
//             lines.push(CanvasUtils.toKonvaObject(
//                 {   
//                     tool: 'pen',
//                     points: this.#getRandomCoors(length),
//                     type: 'line', 
//                     color: 'black',
//                     shapeId: uuid4(),
//                     pos: {x: 0, y: 0},
//                     lineSize: 2,
//                     lineType: 'general'
//                 }
//             ))
//         }

//         return lines
//     }
// }