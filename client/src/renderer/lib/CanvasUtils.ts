import { Shape, ShapeConfig } from "konva/lib/Shape"
import { Shape as IShape } from './protocol'
import Konva from "konva"
import { Group } from "konva/lib/Group"
import { itemIn } from "./twiks"
import { Node } from "konva/lib/Node"
import { Container } from "konva/lib/Container"
import { LineType, ShapeType, Tool } from "./protocol/protocol_bg"

export default class CanvasUtils {

  static readonly #possibleFields = ['tool', 'type', 'color', 'shapeId', 'lineSize', 'lineType',
    'height', 'width', 'radiusX', 'radiusY', 'rotation',
    'scaleX', 'scaleY', 'skewX', 'skewY', 'points', 'x', 'y', 'connected'
  ]

  /**
   * It converts Shape to konva.Shape
   */
  static toKonvaObject(shape: IShape) {
    const globalCompositeOperation: GlobalCompositeOperation = 'source-over'
    const commonAttrs = {
      y: shape.y,
      x: shape.x,
      shape_id: shape.shape_id,
      shadowForStrokeEnabled: false,
      globalCompositeOperation: globalCompositeOperation,
      tool: shape.tool,
      shape_type: shape.shape_type,
      lineSize: shape.line_size,
      color: shape.color,
      lineType: shape.line_type,
      // transform attrs
      rotation: shape.rotation ? shape.rotation : 0,
      scaleX: shape.scale_x,
      scaleY: shape.scale_y,
      skewX: shape.skew_x,
      skewY: shape.skew_y,
      // shapes that are must be connected to this
      connected: shape.connected ? new Set(shape.connected) : new Set(),
    }

    switch (shape.shape_type) {
      case ShapeType.Arrow:
        return (
          new Konva.Arrow({
            ...commonAttrs,
            // TODO: it might not work, so test it
            points: Array.from(shape.points),
            stroke: shape.color,
            fill: shape.color,
            strokeWidth: shape.line_size,
            tension: 0.5,
            lineCap: "round",
            lineJoin: "round",
            hitStrokeWidth: shape.line_size * 15,
            dash: shape.line_type === LineType.General ? [] : [10, 10],
            listening: true,
          })
        )

      case ShapeType.Img: {
        const img = new Image(shape.width, shape.height)
        img.src = shape.url

        return (
          new Konva.Image({
            ...commonAttrs,
            image: img,
            width: shape.width,
            height: shape.height,
            globalCompositeOperation: 'destination-over',
            applyCache: true,
            applyHitFromCache: true,
            listening: true,
          })
        )
      }

      case ShapeType.Rect:
        return (
          new Konva.Rect({
            ...commonAttrs,
            width: shape.width,
            height: shape.height,
            stroke: shape.color,
            strokeWidth: shape.line_size,
            hitStrokeWidth: 30,
            globalCompositeOperation: 'source-over',
            dash: shape.line_type === LineType.General ? [] : [10, 10],
            listening: true,
          })
        )
      case ShapeType.Line:
        return (
          new Konva.Line({
            ...commonAttrs,
            points: Array.from(shape.points),
            stroke: shape.color,
            strokeWidth: shape.line_size,
            dash: shape.line_type === LineType.General ? [] : [10, 10],
            tension: 0.5,
            lineCap: "round",
            lineJoin: "round",
            hitStrokeWidth: shape.line_size * 15,
            globalCompositeOperation: shape.tool === Tool.EraserTool ? 'destination-out' : 'source-over',
            listening: shape.tool !== Tool.EraserTool, // don't listen for clicking on eraser lines
          })
        )
      case ShapeType.Ellipse:
        return (
          new Konva.Ellipse({
            ...commonAttrs,
            radiusX: Math.abs(shape.radius_x),
            radiusY: Math.abs(shape.radius_y),
            stroke: shape.color,
            hitStrokeWidth: 30,
            strokeWidth: shape.line_size,
            dash: shape.line_type === LineType.General ? [] : [10, 10],
            listening: true,
          })
        )
      default:
        throw new TypeError(`No such ShapeType as "${shape.shape_type}"`)
    }
  }

  /**
   * `static toShape(shapeObj: Konva.Shape)` is a static method of the `CanvasUtils` class that takes a `Konva.Shape` object
   * as an argument and returns an `IShape` object. It extracts the relevant attributes from the `Konva.Shape` object and
   * creates a new `IShape` object with those attributes. It also removes any undefined attributes from the `IShape` object
   * before returning it.
   * 
   */
  static toShape(shapeObj: Konva.Shape, serializable = false) {
    // @ts-ignore
    const shape: IShape = {
      tool: shapeObj.attrs.tool,
      shape_type: shapeObj.attrs.shape_type,
      color: shapeObj.attrs.color,
      shape_id: shapeObj.attrs.shape_id,
      line_size: shapeObj.attrs.lineSize,
      line_type: shapeObj.attrs.lineType,
      height: shapeObj.attrs.height ?? 0,
      width: shapeObj.attrs.width ?? 0,
      radius_x: shapeObj.attrs.radiusX ?? 0,
      radius_y: shapeObj.attrs.radiusY ?? 0,
      rotation: shapeObj.attrs.rotation ?? 0,
      scale_x: shapeObj.attrs.scaleX ?? 1,
      scale_y: shapeObj.attrs.scaleY ?? 1,
      skew_x: shapeObj.attrs.skewX ?? 0,
      skew_y: shapeObj.attrs.skewY ?? 0,
      points: serializable ? (shapeObj.attrs.points ?? []) : Uint32Array.from(shapeObj.attrs.points ?? []),
      x: shapeObj.attrs.x,
      y: shapeObj.attrs.y,
      connected: [...shapeObj.attrs.connected],
      url: shapeObj.attrs?.image?.src ?? "",
    }

    return shape
  }

  static toNonSerializableShape(shape: IShape) {
    return {
      ...shape,
      points: Uint32Array.from(shape.points)
    }
  }

  /**
   * `static retrivePossibleFields(attrs: object)` is a static method of the `CanvasUtils` class that takes an
   * object `attrs` as an argument. It returns a new object that contains only the properties of `attrs` that are included in
   * the `CanvasUtils.#possibleFields` array.
   * 
   */
  static retrivePossibleFields(attrs: object): object {
    const possibleFields = new Map()

    for (const [key, value] of Object.entries(attrs)) {
      if (!CanvasUtils.#possibleFields.includes(key)) continue

      if (key !== 'connected') possibleFields.set(key, value)
      else possibleFields.set(key, [...value])
    }

    return Object.fromEntries(possibleFields)
  }

  /**
   * It searchs shapes with the same attrs as in args. Does not work with objects in attrs
   * 
   */
  static find(layer: Konva.Layer, attrs: ShapeConfig) {
    return layer.children.filter(c => {
      let coincidence = 0

      for (const [key, value] of Object.entries(c.attrs)) {
        if (attrs[key] === value) coincidence++
      }

      if (coincidence === Object.keys(attrs).length) return c
    })
  }

  static findLastOne(layer: Konva.Layer, attrs: ShapeConfig) {
    for (let i = layer.children.length - 1; i >= 0; i--) {
      const c = layer.children[i]
      let coincidence = 0

      for (const [key, value] of Object.entries(c.attrs)) {
        if (attrs[key] === value) coincidence++
      }

      if (coincidence === Object.keys(attrs).length) return c
    }
  }

  /**
   * Works like CanvasUtils.find() but returnes only the first found shape. Does not work with objects in attrs
   */
  static findOne(layer: Konva.Layer, attrs: ShapeConfig): Shape | Group | undefined {
    return CanvasUtils.find(layer, attrs)[0]
  }

  /**
   * It searches shapes which attr value in valueList. Does not work with objects in valueList
   */
  static findFew(layer: Konva.Layer | Container<Node | Group>, attr: string, valueList: unknown[]) {
    const searchResult: (Shape | Group)[] = []

    layer.children.forEach(shape => {
      if (itemIn(shape.attrs[attr], ...valueList)) searchResult.push(shape)
    })

    return searchResult
  }

  /**
   * It returns the maximum shape`s y-coordinate in layer found
   */
  static findLastY(layer: Konva.Layer) {
    let y = 0

    layer.children.forEach(shape => {
      if (shape.getType() === 'Group') return
      const s = shape.attrs
      const keys = Object.keys(s)

      if (keys.includes('height')) {
        if (s.y + s.height > y) y = s.y + s.height
      }
      else if (keys.includes('radiusY')) {
        if (s.y + s.radiusY > y) y = s.y + s.radiusY
      }
      else {
        const yList = CanvasUtils.getCoorFromPoints(s.points, 'y')
        const maxShapeY = Math.max(...yList) + s.y
        if (maxShapeY > y) y = maxShapeY
      }
    })

    return y
  }

  /**
   * It returns an array of numbers that represent either the x or y coordinates of
   * the points in the `points` array, depending on the value of `coor`.
   */
  static getCoorFromPoints = (points: number[], coor: 'x' | 'y') => {
    return points.map(
      (item, index) => {
        if ((index + 1) % 2 === 0) {
          if (coor === 'y') return item
        }
        else {
          if (coor === 'x') return item
        }
      }
    ).filter(i => { if (i !== undefined) return i })
  }

  static getHeight(layer: Konva.Layer, baseHeight: number) {
    return Math.round(CanvasUtils.findLastY(layer) / baseHeight) * baseHeight
  }

  static getHeightFromShape(shape: Konva.Shape, baseHeight: number) {
    const layer = new Konva.Layer()
    layer.add(shape)
    return this.getHeight(layer, baseHeight)
  }
}
