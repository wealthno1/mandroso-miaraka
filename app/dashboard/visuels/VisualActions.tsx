"use client"

import { useState } from "react"

type VisualActionsProps = {
  text: string
}

export default function VisualActions({ text }: VisualActionsProps) {
  const [copied, setCopied] = useState(false)

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch {
      window.alert("Impossible de copier automatiquement. Selectionnez le texte manuellement.")
    }
  }

  function printPage() {
    window.print()
  }

  async function openFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      window.alert("Le mode plein ecran n'est pas disponible sur cet appareil.")
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        onClick={copyText}
        className="rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
      >
        {copied ? "Texte copie" : "Copier le texte"}
      </button>

      <button
        type="button"
        onClick={printPage}
        className="rounded-lg bg-gray-800 px-4 py-3 font-bold text-white hover:bg-black"
      >
        Imprimer / PDF
      </button>

      <button
        type="button"
        onClick={openFullscreen}
        className="rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700"
      >
        Plein ecran
      </button>
    </div>
  )
}
