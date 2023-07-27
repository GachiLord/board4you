import ImageUtils from "../../../../../src/desktop/renderer/lib/ImageUtils";
import base64img from "./base64img24x24";


test('should return correct size', async () => {
    const img = base64img
    
    expect(ImageUtils.getSizeOfBase64Img(img)).toBe({height: 24, width: 24})
})
