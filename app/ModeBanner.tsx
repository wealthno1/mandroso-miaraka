export default function ModeBanner() {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE || "production"

  if (appMode !== "formation") {
    return null
  }

  return (
    <div className="w-full bg-orange-600 px-4 py-3 text-center text-sm font-bold text-white shadow">
      MODE FORMATION — DONNEES TEST — NE PAS UTILISER POUR LA VRAIE COLLECTE
    </div>
  )
}
