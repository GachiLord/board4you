import isDeviceMobile from 'is-mobile'

export default function isMobile(){
    return isDeviceMobile({ tablet: true, featureDetect: true })
}