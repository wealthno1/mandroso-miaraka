"use client"

import { type FormEvent, useMemo, useState } from "react"

type BatchResult = {
  batch_id: string
  start_number: number
  end_number: number
  flyer_count: number
  page_count: number
}

export default function ImpressionValopyPage() {
  // 0001 à 0004 existent déjà comme premier lot test Supabase.
  // Nous démarrons à 0005 pour tester la création depuis l'interface.
  const [numeroDepart, setNumeroDepart] = useState("5")
  const [nombreFlyers, setNombreFlyers] = useState("4")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [erreur, setErreur] = useState("")
  const [lotCree, setLotCree] = useState<BatchResult | null>(null)

  const debut = Number(numeroDepart) || 0
  const quantite = Number(nombreFlyers) || 0
  const fin = debut > 0 && quantite > 0 ? debut + quantite - 1 : 0
  const nombrePages = quantite > 0 ? Math.ceil(quantite / 2) : 0

  const numeroFormate = (numero: number) =>
    numero > 0 ? numero.toString().padStart(4, "0") : "----"

  const lotValide = useMemo(() => {
    return (
      Number.isInteger(debut) &&
      debut > 0 &&
      Number.isInteger(quantite) &&
      quantite > 0 &&
      quantite % 2 === 0 &&
      quantite <= 1000
    )
  }, [debut, quantite])

  async function creerLot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!lotValide || loading) return

    setLoading(true)
    setMessage("")
    setErreur("")
    setLotCree(null)

    try {
      const response = await fetch("/api/impression-valopy/create-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startNumber: debut,
          flyerCount: quantite,
          batchName: `TEST INTERFACE - Lot N° ${numeroFormate(debut)} à N° ${numeroFormate(fin)}`,
          notes: "DONNEE TEST - CREATION DEPUIS INTERFACE A SUPPRIMER AVANT IMPRESSION REELLE",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErreur(
          result.error || "Impossible de créer le lot d’impression."
        )
        return
      }

      const batch = result.batch as BatchResult

      setLotCree(batch)
      setMessage(
        "Lot test créé avec succès. La génération du PDF sera ajoutée à l’étape suivante."
      )
    } catch (error) {
      console.error(error)
      setErreur("Erreur de communication avec le serveur.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">
        Impression numérotée des Valopy Finoana
      </h1>

      <p className="mb-8 text-gray-600">
        Génération de feuilles A4 contenant deux flyers A5 paysage numérotés.
      </p>

      <form
        onSubmit={creerLot}
        className="max-w-3xl rounded-2xl bg-white p-6 shadow"
      >
        <h2 className="mb-6 text-2xl font-bold">
          Préparer un lot d’impression
        </h2>

        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          <p className="font-bold">Mode test actuel</p>
          <p>
            Les numéros N° 0001 à N° 0004 existent déjà. Pour le test depuis
            l’interface, utilisez N° 0005 à N° 0008.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">
              Campagne
            </label>

            <input
              type="text"
              value="Valopy Finoana — Iray Volana ho an’ny Tompo — 21 Jona 2026"
              disabled
              className="w-full rounded-lg border bg-gray-100 p-4 text-gray-700"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Premier numéro à imprimer
            </label>

            <input
              type="number"
              min="1"
              value={numeroDepart}
              onChange={(event) => setNumeroDepart(event.target.value)}
              className="w-full rounded-lg border p-4"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Nombre de flyers à imprimer
            </label>

            <input
              type="number"
              min="2"
              max="1000"
              step="2"
              value={nombreFlyers}
              onChange={(event) => setNombreFlyers(event.target.value)}
              className="w-full rounded-lg border p-4"
            />

            <p className="mt-2 text-sm text-gray-500">
              Saisir un nombre pair : 2 flyers correspondent à une feuille A4.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-blue-50 p-5">
          <h3 className="mb-4 text-lg font-bold text-blue-900">
            Résumé du lot
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-gray-500">Du numéro</p>
              <p className="text-2xl font-bold text-blue-900">
                N° {numeroFormate(debut)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-gray-500">Au numéro</p>
              <p className="text-2xl font-bold text-blue-900">
                N° {numeroFormate(fin)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-4">
              <p className="text-sm text-gray-500">Feuilles A4</p>
              <p className="text-2xl font-bold text-blue-900">
                {nombrePages}
              </p>
            </div>
          </div>
        </div>

        {!lotValide && (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            Veuillez choisir un numéro positif et un nombre pair de flyers,
            sans dépasser 1000 flyers par lot.
          </p>
        )}

        {erreur && (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            {erreur}
          </p>
        )}

        {message && (
          <p className="mt-5 rounded-lg bg-green-50 p-4 text-green-700">
            {message}
          </p>
        )}

        {lotCree && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
            <h3 className="mb-3 font-bold text-green-800">
              Lot enregistré dans la base
            </h3>

            <p className="text-green-800">
              Numéros créés :{" "}
              <strong>
                N° {numeroFormate(lotCree.start_number)} à N°{" "}
                {numeroFormate(lotCree.end_number)}
              </strong>
            </p>

            <p className="text-green-800">
              Flyers : <strong>{lotCree.flyer_count}</strong> — Feuilles A4 :{" "}
              <strong>{lotCree.page_count}</strong>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!lotValide || loading}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? "Création du lot..." : "Créer le lot test numéroté"}
        </button>

        <p className="mt-4 text-sm text-gray-500">
          À cette étape, le bouton enregistre les numéros. Le PDF imprimable
          sera généré dans l’étape suivante.
        </p>
      </form>
    </div>
  )
}