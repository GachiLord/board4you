import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils"
import { v4 as uuid } from 'uuid'
import { test, describe } from "node:test"
import assert from "node:assert"

describe('unit/renderer/EditManager/applyEdit:remove', () => {
  // @ts-ignore
  global.location = {
    protocol: 'http',
    host: 'localhost'
  }
  test('applyEdit should remove shape when type is "remove"', () => {
    const testCase = getTestCase(2)
    const shapeToRemove = testCase.layer.children.at(-1)

    if (!(shapeToRemove instanceof Konva.Shape)) throw new Error()

    testCase.manager.applyEdit({
      id: uuid(),
      edit_type: 'remove',
      shapes: [CanvasUtils.toShape(shapeToRemove)]
    })

    assert.ok(!testCase.layer.children.includes(shapeToRemove))
  })
  test('applyEdit should remove multiple shapes when type is "remove"', () => {
    const testCase = getTestCase(4)
    const shapeToRemove1 = testCase.layer.children.at(-1)
    const shapeToRemove2 = testCase.layer.children.at(-2)


    if (!(shapeToRemove1 instanceof Konva.Shape)) throw new Error()
    if (!(shapeToRemove2 instanceof Konva.Shape)) throw new Error()

    testCase.manager.applyEdit({
      id: uuid(),
      edit_type: 'remove',
      shapes: [
        CanvasUtils.toShape(shapeToRemove1),
        CanvasUtils.toShape(shapeToRemove2)
      ]
    })

    assert.ok(
      !testCase.layer.children.includes(shapeToRemove1)
      && !testCase.layer.children.includes(shapeToRemove2))
  })
})
