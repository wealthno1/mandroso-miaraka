"use client"

import { useEffect, useRef, useState } from "react"

export default function AnimatedAmount({
  value,
}: {
  value: number
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValue = useRef(value)

  useEffect(() => {
    const start = previousValue.current
    const end = value
    const duration = 2500
    const startTime = performance.now()

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3)
    }

    function animate(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = easeOutCubic(progress)
      const current = Math.round(start + (end - start) * eased)

      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        previousValue.current = end
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return <>{displayValue.toLocaleString()} Ar</>
}