import getLocalizationCfg from "../../../src/common/getLocalizationCfg";
import localization from "../../../src/common/localization";
import { test, describe } from "node:test"
import assert from "node:assert"


describe("unit/common/getLocalizationCfg", () => {
    test('should return English localization for "en"', () => {
        assert.deepStrictEqual(getLocalizationCfg('en'), localization['en'])
    })
    
    test('should return localization on partial match at the start"', () => {
        assert.deepStrictEqual(getLocalizationCfg('en-AU'), localization['en'])
    })
    
    test('should not return localization on partial match at the end', () => {
        assert.deepStrictEqual(getLocalizationCfg('AU-en'), localization['en'])
    })
    
    test('should return localization for long locale', () => {
        assert.deepStrictEqual(getLocalizationCfg('en-GB-oxendict'), localization['en'])
    })
    
    test('should return English localization on no match', () => {
        assert.deepStrictEqual(getLocalizationCfg(''), localization['en'])
    })
    
    test('should return a non-english config with the same keys as in English one', () => {
        const enKeys = Object.keys(localization['en'])
        const ruKeys = Object.keys(getLocalizationCfg('ru'))
    
        assert.ok(enKeys.every(key => ruKeys.includes(key)))
    })
    
    test('config values should not be undefined', () => {
        const values = Object.values(getLocalizationCfg('ru'))
    
        assert.ok(values.every( i => i !== undefined ))
    })
    
    test('config values should not be null', () => {
        const values = Object.values(getLocalizationCfg('ru'))
    
        assert.ok(values.every( i => i !== null ))
    })
})