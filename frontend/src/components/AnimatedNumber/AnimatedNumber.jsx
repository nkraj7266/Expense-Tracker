import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { DURATION_COUNT_UP, EASE_STANDARD } from '../../lib/motion'

export default function AnimatedNumber({ value, decimals = 2 }) {
  const [display, setDisplay] = useState(value)
  const prefersReducedMotion = useReducedMotion()
  const prevValueRef = useRef(value)

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value)
      prevValueRef.current = value
      return undefined
    }

    const controls = animate(prevValueRef.current, value, {
      duration: DURATION_COUNT_UP,
      ease: EASE_STANDARD,
      onUpdate: setDisplay,
    })
    prevValueRef.current = value
    return () => controls.stop()
  }, [value, prefersReducedMotion])

  return display.toFixed(decimals)
}
