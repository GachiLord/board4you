const cfg = require('./localization')

/**
 * This function returns localization config according locale name string
 * @name getLocalizationCfg
 * @param {string} locale 
 * @returns {object}
 */
module.exports = function(locale){
    const locales = Object.keys(cfg)
    const checkMatch = (s) => {
        s = s.toLowerCase()
        const checks = locale.split('-').map( item => { 
            item = item.toLowerCase()
            if ( s.includes(item) ) return true
        } )
        return checks.includes(true)
    } 

    for (let i in locales){
        let l = locales[i]
        if (locale === l) return getFullCfg(cfg[l])
        else if (checkMatch(l)) return getFullCfg(cfg[l])
    }

    return cfg.en
}

// replace undefined fields with english fields
function getFullCfg(config){
    let configCopy = {...config}
    let fullConfFields = Object.keys(configCopy)
    let requiredFields = Object.keys(cfg.en)

    requiredFields.forEach(f => {
        if ( !fullConfFields.includes(f) ) configCopy[f] = cfg.en[f]
    });

    return configCopy
}