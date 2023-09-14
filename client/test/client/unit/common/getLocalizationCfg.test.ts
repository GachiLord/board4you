import getLocalizationCfg from "../../../../src/common/getLocalizationCfg";
import localization from "../../../../src/common/localization";


test('should return English localization for "en"', () => {
    expect(getLocalizationCfg('en')).toStrictEqual(localization['en'])
})

test('should return localization on partial match at the start"', () => {
    expect(getLocalizationCfg('en-AU')).toStrictEqual(localization['en'])
})

test('should not return localization on partial match at the end', () => {
    expect(getLocalizationCfg('AU-en')).toStrictEqual(localization['en'])
})

test('should return localization for long locale', () => {
    expect(getLocalizationCfg('en-GB-oxendict')).toStrictEqual(localization['en'])
})

test('should return English localization on no match', () => {
    expect(getLocalizationCfg('')).toStrictEqual(localization['en'])
})

test('should return a non-english config with the same keys as in English one', () => {
    const enKeys = Object.keys(localization['en'])
    const ruKeys = Object.keys(getLocalizationCfg('ru'))

    expect(enKeys).toEqual(ruKeys)
})

test('config values should not be undefined', () => {
    const values = Object.values(getLocalizationCfg('ru'))

    expect(values).not.toContain(undefined)
})

test('config values should not be null', () => {
    const values = Object.values(getLocalizationCfg('ru'))

    expect(values).not.toContain(null)
})