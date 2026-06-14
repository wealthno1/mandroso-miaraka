"use client"

import { useEffect, useMemo, useState } from "react"

type Envelope = {
  id: string
  envelope_number: string
  beneficiary_name: string | null
  status: string | null
  total_paid: number | string | null
  final_category: string | null
  is_anonymous: boolean | null
}

type CategoryStat = {
  key: string
  label: string
  count: number
  closed: number
  inProgress: number
  amount: number
}

const CATEGORY_ROWS = [
  { key: "VALOPY VY", label: "Fer / Valopy Vy" },
  { key: "VARAHINA", label: "Cuivre / Varahina" },
  { key: "BRONZE", label: "Bronze" },
  { key: "VOLAFOTSY", label: "Argent / Volafotsy" },
  { key: "VOLAMENA", label: "Or / Volamena" },
  { key: "PLATININA", label: "Platine / Platinina" },
  { key: "DIAMONDRA", label: "Diamant / Diamondra" },
  { key: "NON_CATEGORISEE", label: "Non catégorisée" },
]

function formatAmount(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`
}

function normalizeCategory(value: string | null | undefined) {
  const category = value?.trim().toUpperCase()

  if (!category) return "NON_CATEGORISEE"
  if (category.includes("VY") || category.includes("FER")) return "VALOPY VY"
  if (category.includes("BRONZE")) return "BRONZE"
  if (category.includes("VARAHINA") || category.includes("CUIVRE")) return "VARAHINA"
  if (category.includes("VOLAFOTSY") || category.includes("ARGENT")) return "VOLAFOTSY"
  if (category.includes("VOLAMENA") || category.includes("OR")) return "VOLAMENA"
  if (category.includes("PLATININA") || category.includes("PLATINE")) return "PLATININA"
  if (category.includes("DIAMONDRA") || category.includes("DIAMANT")) return "DIAMONDRA"

  return "NON_CATEGORISEE"
}

function getStatusLabel(status: string | null | undefined) {
  if (status === "closed") return "Clôturée"
  if (status === "in_progress") return "En cours"
  if (status === "distributed") return "Distribuée"
  if (status === "cancelled") return "Annulée"
  return status || "-"
}

export default function CategoriesPage() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastRefresh, setLastRefresh] = useState("")

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/enveloppes", {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Chargement impossible.")
      }

      setEnvelopes(Array.isArray(payload.envelopes) ? payload.envelopes : [])
      setLastRefresh(new Date().toLocaleString("fr-FR"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const stats = useMemo(() => {
    const map = new Map<string, CategoryStat>()

    for (const row of CATEGORY_ROWS) {
      map.set(row.key, {
        key: row.key,
        label: row.label,
        count: 0,
        closed: 0,
        inProgress: 0,
        amount: 0,
      })
    }

    for (const envelope of envelopes) {
      if (envelope.status === "cancelled") continue

      const key = normalizeCategory(envelope.final_category)
      const current = map.get(key) || map.get("NON_CATEGORISEE")

      if (!current) continue

      const amount = Number(envelope.total_paid || 0)

      current.count += 1
      current.amount += Number.isFinite(amount) ? amount : 0

      if (envelope.status === "closed") {
        current.closed += 1
      }

      if (envelope.status === "in_progress") {
        current.inProgress += 1
      }
    }

    return CATEGORY_ROWS.map((row) => map.get(row.key)).filter(Boolean) as CategoryStat[]
  }, [envelopes])

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, row) => {
        acc.count += row.count
        acc.closed += row.closed
        acc.inProgress += row.inProgress
        acc.amount += row.amount
        return acc
      },
      { count: 0, closed: 0, inProgress: 0, amount: 0 }
    )
  }, [stats])

  const latestCategorized = useMemo(() => {
    return envelopes
      .filter((envelope) => envelope.status !== "cancelled")
      .filter((envelope) => Number(envelope.total_paid || 0) > 0)
      .slice()
      .sort((a, b) => String(b.envelope_number).localeCompare(String(a.envelope_number)))
      .slice(0, 10)
  }, [envelopes])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Catégories d’enveloppes</h1>
          <p className="mt-2 text-gray-600">
            Synthèse automatique des valopy par catégorie : Fer, Cuivre, Bronze,
            Argent, Or, Platine et Diamant.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
        >
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 font-bold text-red-800">
          ❌ {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Enveloppes suivies</p>
          <p className="mt-2 text-3xl font-bold">{totals.count}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Clôturées</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{totals.closed}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">En cours</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{totals.inProgress}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Total collecté</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {formatAmount(totals.amount)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Résumé par catégorie</h2>
          <p className="text-sm text-gray-500">
            Dernière actualisation : {lastRefresh || "-"}
          </p>
        </div>

        {loading ? (
          <p className="text-gray-600">Chargement des catégories...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Catégorie</th>
                  <th className="p-3 text-right">Enveloppes</th>
                  <th className="p-3 text-right">Clôturées</th>
                  <th className="p-3 text-right">En cours</th>
                  <th className="p-3 text-right">Montant collecté</th>
                </tr>
              </thead>

              <tbody>
                {stats.map((row) => (
                  <tr key={row.key} className="border-b">
                    <td className="p-3 font-bold">{row.label}</td>
                    <td className="p-3 text-right">{row.count}</td>
                    <td className="p-3 text-right">{row.closed}</td>
                    <td className="p-3 text-right">{row.inProgress}</td>
                    <td className="p-3 text-right font-bold text-green-700">
                      {formatAmount(row.amount)}
                    </td>
                  </tr>
                ))}

                <tr className="bg-gray-100 font-bold">
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-right">{totals.count}</td>
                  <td className="p-3 text-right">{totals.closed}</td>
                  <td className="p-3 text-right">{totals.inProgress}</td>
                  <td className="p-3 text-right text-green-700">
                    {formatAmount(totals.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Dernières enveloppes avec paiement</h2>

        {latestCategorized.length === 0 ? (
          <p className="text-gray-600">Aucune enveloppe payée pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Valopy</th>
                  <th className="p-3">Bénéficiaire</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Montant</th>
                </tr>
              </thead>

              <tbody>
                {latestCategorized.map((envelope) => (
                  <tr key={envelope.id} className="border-b">
                    <td className="p-3 font-bold">{envelope.envelope_number}</td>
                    <td className="p-3">
                      {envelope.is_anonymous
                        ? "TSY MITONONA ANARANA"
                        : envelope.beneficiary_name || "-"}
                    </td>
                    <td className="p-3">
                      {
                        CATEGORY_ROWS.find(
                          (row) => row.key === normalizeCategory(envelope.final_category)
                        )?.label
                      }
                    </td>
                    <td className="p-3">{getStatusLabel(envelope.status)}</td>
                    <td className="p-3 text-right font-bold text-green-700">
                      {formatAmount(Number(envelope.total_paid || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <strong>Rappel :</strong> la catégorie est calculée automatiquement quand une enveloppe
        est clôturée. Les enveloppes non clôturées ou sans paiement final apparaissent dans
        “Non catégorisée”.
      </div>
    </div>
  )
}
