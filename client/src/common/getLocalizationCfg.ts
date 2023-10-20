import cfg, { localization } from './localization'

/**
 * This function returns localization config according locale name string
 * @name getLocalizationCfg
 * @param {string} locale 
 * @returns {object}
 */
export default function(locale: string): localization{
    const locales = Object.keys(cfg)
    const checkMatch = (s: string) => {
        s = s.toLowerCase()
        const checks = locale.split('-').map( item => { 
            item = item.toLowerCase()
            if ( s.includes(item) ) return true
        } )
        return checks.includes(true)
    } 

    for (const i in locales){
        const l = locales[i]
        if (locale === l) return getFullCfg(cfg[l])
        else if (checkMatch(l)) return getFullCfg(cfg[l])
    }

    return cfg.en
}

// replace undefined fields with english fields
function getFullCfg(config: localization){
    const configCopy = {...config}
    const fullConfFields = Object.keys(configCopy)
    const requiredFields = Object.keys(cfg.en)

    requiredFields.forEach(f => {
        if ( !fullConfFields.includes(f) ) configCopy[f] = cfg.en[f]
    });

    return configCopy
}