"use client"

import { useEffect, useState } from "react"

const verses = [
  "1 Tantara 29:1b — nefa lehibe ny asa, fa tsy lapa ho an'olona, fa ho an'i Jehovah Andriamanitra.",
  "Lioka 6:38 — Omeo, dia mba homena ianareo.",
  "2 Korintiana 9:7 fa ny mpanome amin'ny fifaliana no tian'Andriamanitra",
]

export default function RotatingVerse() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % verses.length)
    }, 10000)

    return () => clearInterval(timer)
  }, [])

  return (
    <p className="mt-4 text-lg italic text-blue-100">
      “{verses[index]}”
    </p>
  )
}