import Konva from "konva"
import getTestCase from "./getTestCase"
import CanvasUtils from "../../../../src/renderer/lib/CanvasUtils"
import { v4 as uuid } from 'uuid'
import { test, describe } from "node:test"
import assert from "node:assert"


describe('unit/renderer/EditManager/cancelEdit:add', () => {
  // @ts-ignore
  global.location = {
    protocol: 'http',
    host: 'localhost'
  }
  test('cancelEdit should remove shape when type is "add"', () => {
    const testCase = getTestCase(2)
    const shapeToRemove = testCase.layer.children.at(-1)

    if (!(shapeToRemove instanceof Konva.Shape)) throw new Error()

    testCase.manager.cancelEdit({
      id: uuid(),
      edit_type: 'add',
      shape: CanvasUtils.toShape(shapeToRemove)
    })

    assert.equal(testCase.layer.children.length, 1)
  })
})
