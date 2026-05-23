"use client"

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type BatchResult = {
  batch_id: string
  start_number: number
  end_number: number
  flyer_count: number
  page_count: number
}

type ExistingBatch = {
  id: string
  batch_name: string
  start_number: number
  end_number: number
  flyer_count: number
  page_count: number
  batch_type: string | null
  notes: string | null
  created_at: string
}

type CreateBatchResponse = {
  batch?: BatchResult
  error?: string
}

type ExistingBatchesResponse = {
  batches?: ExistingBatch[]
  error?: string
}

export default function ImpressionValopyPage() {
  /*
    MODE RÉEL :
    - Les lots tests ont été supprimés de la base.
    - La première série réelle peut commencer à N° 0001.
    - La quantité reste vide volontairement afin d'éviter une création accidentelle.
  */
  const [numeroDepart, setNumeroDepart] = useState("1")
  const [nombreFlyers, setNombreFlyers] = useState("")
  const [confirmationReelle, setConfirmationReelle] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [erreur, setErreur] = useState("")
  const [lotCree, setLotCree] = useState<BatchResult | null>(null)

  const [lotsExistants, setLotsExistants] = useState<ExistingBatch[]>([])
  const [chargementLots, setChargementLots] = useState(true)
  const [erreurLots, setErreurLots] = useState("")

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

  const lotPeutEtreCree = lotValide && confirmationReelle && !loading

  const chargerLotsExistants = useCallback(async () => {
    setChargementLots(true)
    setErreurLots("")

    try {
      const response = await fetch("/api/impression-valopy/batches", {
        method: "GET",
        cache: "no-store",
      })

      const result = (await response.json()) as ExistingBatchesResponse

      if (!response.ok) {
        setErreurLots(
          result.error || "Impossible de charger les lots d’impression."
        )
        return
      }

      setLotsExistants(result.batches ?? [])
    } catch (error) {
      console.error("Erreur chargement lots d’impression :", error)
      setErreurLots("Erreur de communication lors du chargement des lots.")
    } finally {
      setChargementLots(false)
    }
  }, [])

  useEffect(() => {
    void chargerLotsExistants()
  }, [chargerLotsExistants])

  async function creerLotReel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!lotPeutEtreCree) return

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
          batchName: `PRODUCTION - Lot N° ${numeroFormate(debut)} à N° ${numeroFormate(fin)}`,
          notes: "LOT REEL - IMPRESSION PRODUCTION VALOPY FINOANA",
        }),
      })

      const result = (await response.json()) as CreateBatchResponse

      if (!response.ok || !result.batch) {
        setErreur(
          result.error || "Impossible de créer le lot réel d’impression."
        )
        return
      }

      setLotCree(result.batch)
      setConfirmationReelle(false)
      setMessage(
        "Lot réel enregistré avec succès. Ouvrez maintenant le PDF numéroté pour l’imprimer."
      )

      await chargerLotsExistants()
    } catch (error) {
      console.error("Erreur création lot réel d’impression :", error)
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
        onSubmit={creerLotReel}
        className="max-w-3xl rounded-2xl bg-white p-6 shadow"
      >
        <h2 className="mb-6 text-2xl font-bold">
          Préparer un lot d’impression
        </h2>

        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-bold">Mode impression réelle</p>
          <p>
            Les données tests ont été retirées. Les numéros créés ici seront
            définitifs et rattachés à la campagne Valopy Finoana. Vérifiez la
            plage de numéros et la quantité avant de confirmer.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">Campagne</label>
            <input
              type="text"
              value="Valopy Finoana — Iray Volana ho an’ny Tompo — 21 Jona 2026"
              disabled
              className="w-full rounded-lg border bg-gray-100 p-4 text-gray-700"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Premier numéro réel à imprimer
            </label>
            <input
              type="number"
              min="1"
              value={numeroDepart}
              onChange={(event) => {
                setNumeroDepart(event.target.value)
                setConfirmationReelle(false)
              }}
              className="w-full rounded-lg border p-4"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Nombre réel de flyers à imprimer
            </label>
            <input
              type="number"
              min="2"
              max="1000"
              step="2"
              value={nombreFlyers}
              onChange={(event) => {
                setNombreFlyers(event.target.value)
                setConfirmationReelle(false)
              }}
              placeholder="Exemple : 100"
              className="w-full rounded-lg border p-4"
            />
            <p className="mt-2 text-sm text-gray-500">
              Saisir un nombre pair : 2 flyers correspondent à une feuille A4.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-blue-50 p-5">
          <h3 className="mb-4 text-lg font-bold text-blue-900">
            Résumé du lot réel
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
                {nombrePages || "—"}
              </p>
            </div>
          </div>
        </div>

        {!lotValide && quantite > 0 && (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            Veuillez choisir un numéro positif et un nombre pair de flyers,
            sans dépasser 1000 flyers par lot.
          </p>
        )}

        {lotValide && (
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
            <input
              type="checkbox"
              checked={confirmationReelle}
              onChange={(event) => setConfirmationReelle(event.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span>
              <strong>Je confirme la création réelle :</strong> je vais
              enregistrer définitivement les enveloppes N°{" "}
              {numeroFormate(debut)} à N° {numeroFormate(fin)}, soit{" "}
              {quantite} flyers sur {nombrePages} feuilles A4.
            </span>
          </label>
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
              Lot réel enregistré dans la base
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
            <a
              href={`/api/impression-valopy/pdf/${lotCree.batch_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex rounded-xl bg-green-700 px-5 py-3 font-bold text-white transition hover:bg-green-800"
            >
              Ouvrir le PDF numéroté
            </a>
            <p className="mt-3 text-sm text-green-700">
              L’ouverture du PDF ne crée pas de nouveaux numéros.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!lotPeutEtreCree}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? "Création du lot réel..." : "Créer le lot réel numéroté"}
        </button>

        <p className="mt-4 text-sm text-gray-500">
          Cette action enregistre de nouveaux numéros réels. Pour rouvrir un
          PDF déjà généré, utilisez la liste des lots existants ci-dessous.
        </p>
      </form>

      <section className="mt-8 max-w-3xl rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Lots d’impression existants</h2>
            <p className="mt-1 text-sm text-gray-600">
              Retrouvez un lot déjà créé et ouvrez son PDF sans générer de
              nouveaux numéros.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void chargerLotsExistants()}
            disabled={chargementLots}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {chargementLots ? "Chargement..." : "Actualiser"}
          </button>
        </div>

        {chargementLots && (
          <p className="rounded-lg bg-gray-50 p-4 text-gray-600">
            Chargement des lots...
          </p>
        )}
        {erreurLots && (
          <p className="rounded-lg bg-red-50 p-4 text-red-700">
            {erreurLots}
          </p>
        )}
        {!chargementLots && !erreurLots && lotsExistants.length === 0 && (
          <p className="rounded-lg bg-gray-50 p-4 text-gray-600">
            Aucun lot d’impression enregistré.
          </p>
        )}

        {!chargementLots && !erreurLots && lotsExistants.length > 0 && (
          <div className="space-y-4">
            {lotsExistants.map((lot) => {
              const notes = lot.notes?.toUpperCase() ?? ""
              const estTest = notes.includes("TEST")
              const estReel = notes.includes("LOT REEL")

              return (
                <div
                  key={lot.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="font-bold text-gray-900">
                        N° {numeroFormate(lot.start_number)} à N°{" "}
                        {numeroFormate(lot.end_number)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {lot.flyer_count} flyers — {lot.page_count} feuilles A4
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {lot.batch_name}
                      </p>
                      {estReel && (
                        <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          LOT RÉEL
                        </span>
                      )}
                      {estTest && (
                        <span className="mt-2 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                          LOT DE TEST
                        </span>
                      )}
                    </div>
                    <a
                      href={`/api/impression-valopy/pdf/${lot.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex justify-center rounded-xl bg-green-700 px-5 py-3 font-bold text-white transition hover:bg-green-800"
                    >
                      Ouvrir le PDF
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
