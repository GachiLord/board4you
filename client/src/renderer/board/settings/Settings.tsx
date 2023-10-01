import {IoSettingsOutline} from 'react-icons/io5'
import React from 'react'
import IconWrap from '../toolPanel/IconWrap'


export default function Settings(){
    return (
        <div className='m-2'>
            <IconWrap style={{ size: '2em' }}>
                <IoSettingsOutline />
            </IconWrap>
        </div>
    )
}