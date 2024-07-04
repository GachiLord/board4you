import { encode_user_msg, decode_user_msg, Add, Shape, Tool, ShapeType } from "./protocol";
// create a msg
const shape: Shape = { "x": 0.0, "y": 0.0, "tool": Tool.PenTool, "shape_type": ShapeType.Line, "shape_id": "1873257d-9d47-41ec-a187-8a7acf9c0a8c", "color": "#000000", "line_size": 2, "line_type": "general", "height": 0, "width": 0, "radius_x": 0, "radius_y": 0, "rotation": 0.0, "scale_x": 1.0, "scale_y": 1.0, "skew_x": 0.0, "skew_y": 0.0, "points": Uint32Array.from([554, 268, 533, 266, 499, 266, 466, 279, 444, 297, 432, 317, 431, 335, 435, 342, 457, 347, 503, 333, 561, 297, 605, 259, 616, 242, 615, 241, 600, 241, 560, 260, 514, 294, 482, 332, 476, 362, 507, 380, 590, 380, 698, 358, 790, 340, 838, 332, 844, 331, 840, 334, 803, 361, 756, 397, 708, 435, 694, 445]), "connected": [], "url": "", free: () => { } }
const add: Add = { id: "f2a442b3-5566-4080-af93-4d9ba95ee716", edit_type: "add", shape, free: () => { } }
const push = { Push: { data: [{ edit: { Add: add } }], silent: true } }
const msg = { msg: push };
// encode message(this may throw an error)
const binary = encode_user_msg(msg)
// decode binary(this may throw an error)
const newMsg = decode_user_msg(binary);
// print both meessages
console.log(msg)
console.log(newMsg)
