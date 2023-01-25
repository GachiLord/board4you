import React from 'react'
import { useSpring, animated } from '@react-spring/web'
import { Undo, Redo } from './Buttons'
import primaryColor from '../../base/primaryColor'


export default function() {    
    const animStart = {
        color: 'black',
        size: '1.7em'
    }
    const animEnd = {
        color: primaryColor,
        size: '2em'
    }
    const AnimatedUndo = animated(Undo)
    const AnimatedRedo = animated(Redo)
    const [undoSpring, undoApi] = useSpring(() => ({from: animStart}))
    const [redoSpring, redoApi] = useSpring(() => ({from: animStart}))
    const anim = (api) => {
        api.start({
            from: animStart,
            to: animEnd,
            config: { duration: 200 },
        })
        api.start({
            from: animEnd,
            to: animStart,
            config: { duration: 200 },
        })
      }
    
    

    return (
        <div className='d-flex justify-content-center'>
            <AnimatedUndo style={undoSpring} onClick={ () => {anim(undoApi)} }/>
            <AnimatedRedo style={redoSpring} onClick={ () => {anim(redoApi)} }/>
        </div>
    )
}