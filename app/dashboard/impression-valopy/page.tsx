"use client"

import { useMemo, useState } from "react"

export default function ImpressionValopyPage() {
  const [numeroDepart, setNumeroDepart] = useState("1")
  const [nombreFlyers, setNombreFlyers] = useState("4")

  const debut = Number(numeroDepart) || 0
  const quantite = Number(nombreFlyers) || 0
  const fin = debut > 0 && quantite > 0 ? debut + quantite - 1 : 0
  const nombrePages = Math.ceil(quantite / 2)

  const numeroFormate = (numero: number) =>
    numero > 0 ? numero.toString().padStart(4, "0") : "----"

  const lotValide = useMemo(() => {
    return debut > 0 && quantite > 0 && quantite % 2 === 0
  }, [debut, quantite])

  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">
        Impression numérotée des Valopy Finoana
      </h1>

      <p className="mb-8 text-gray-600">
        Génération de feuilles A4 contenant deux flyers A5 paysage numérotés.
      </p>

      <div className="max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-6 text-2xl font-bold">
          Préparer un lot d’impression
        </h2>

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
                {quantite > 0 ? nombrePages : 0}
              </p>
            </div>
          </div>
        </div>

        {!lotValide && (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            Veuillez choisir un numéro positif et un nombre pair de flyers.
          </p>
        )}

        <button
          type="button"
          disabled={!lotValide}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Générer le lot et le PDF
        </button>

        <p className="mt-4 text-sm text-gray-500">
          Le bouton sera activé techniquement à l’étape suivante, après création
          de la route serveur sécurisée.
        </p>
      </div>
    </div>
  )
}