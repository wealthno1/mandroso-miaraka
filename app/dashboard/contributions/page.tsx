"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type Contribution = {
  id: string
  campaign_id: string | null
  contributor_name: string | null
  display_name: string | null
  amount: number | string
  contribution_date: string | null
  payment_method: string | null
  notes: string | null
  comment: string | null
  event_type: string | null
  contribution_type: string | null
  event_name: string | null
  is_anonymous: boolean | null
  envelope_category: string | null
  operator_name: string | null
  status: "active" | "cancelled"
  cancelled_at: string | null
  cancellation_reason: string | null
  cancelled_by: string | null
  updated_at: string | null
  updated_by: string | null
  last_update_reason: string | null
}

type Summary = {
  displayedCount: number
  activeTotal: number
  cancelledTotal: number
}

type ApiResponse = {
  contributions: Contribution[]
  summary: Summary
}

const paymentMethods = ["Espèces", "MVola", "Orange Money", "Virement", "Chèque"]

function formatAmount(amount: number | string) {
  return `${Number(amount || 0).toLocaleString("fr-FR")} Ar`
}

function formatDate(value: string | null) {
  if (!value) return "Date non renseignée"

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function toInputDateTime(value: string | null) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)

  return localDate.toISOString().slice(0, 16)
}

function getDisplayName(contribution: Contribution) {
  if (contribution.is_anonymous) return "TSY MITONONA ANARANA"

  return (
    contribution.display_name ||
    contribution.contributor_name ||
    "Nom non renseigné"
  )
}

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [summary, setSummary] = useState<Summary>({
    displayedCount: 0,
    activeTotal: 0,
    cancelledTotal: 0,
  })

  const [statusFilter, setStatusFilter] = useState("active")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Espèces")
  const [notes, setNotes] = useState("")
  const [contributionDate, setContributionDate] = useState("")

  const [editingContribution, setEditingContribution] =
    useState<Contribution | null>(null)
  const [editName, setEditName] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState("Espèces")
  const [editNotes, setEditNotes] = useState("")
  const [editContributionDate, setEditContributionDate] = useState("")
  const [editReason, setEditReason] = useState("")

  const [cancelContribution, setCancelContribution] =
    useState<Contribution | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  async function loadContributions() {
    setLoading(true)
    setMessage("")

    try {
      const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter,
      })

      if (search.trim()) {
        params.set("search", search.trim())
      }

      const response = await fetch(`/api/contributions?${params.toString()}`, {
        cache: "no-store",
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Impossible de charger les contributions.")
        return
      }

      const data = result as ApiResponse

      setContributions(data.contributions)
      setSummary(data.summary)
    } catch (error) {
      console.error(error)
      setMessage("Erreur réseau pendant le chargement des contributions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContributions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter])

  async function handleCreateContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    const amountNumber = Number(amount)

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage("Le montant doit être supérieur à zéro.")
      return
    }

    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contributorName: name,
          amount: amountNumber,
          paymentMethod,
          notes,
          contributionDate: contributionDate || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Impossible d’ajouter la contribution.")
        return
      }

      setName("")
      setAmount("")
      setPaymentMethod("Espèces")
      setNotes("")
      setContributionDate("")
      setMessage("Contribution ajoutée avec succès.")

      await loadContributions()
    } catch (error) {
      console.error(error)
      setMessage("Erreur réseau pendant l’ajout de la contribution.")
    }
  }

  function openEditModal(contribution: Contribution) {
    setEditingContribution(contribution)
    setEditName(contribution.contributor_name || "")
    setEditAmount(String(contribution.amount || ""))
    setEditPaymentMethod(contribution.payment_method || "Espèces")
    setEditNotes(contribution.notes || "")
    setEditContributionDate(toInputDateTime(contribution.contribution_date))
    setEditReason("")
  }

  async function handleUpdateContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingContribution) return

    const amountNumber = Number(editAmount)

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage("Le montant modifié doit être supérieur à zéro.")
      return
    }

    if (!editReason.trim()) {
      setMessage("Le motif de modification est obligatoire.")
      return
    }

    try {
      const response = await fetch(
        `/api/contributions/${editingContribution.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contributorName: editName,
            amount: amountNumber,
            paymentMethod: editPaymentMethod,
            notes: editNotes,
            contributionDate: editContributionDate || undefined,
            reason: editReason,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Impossible de modifier la contribution.")
        return
      }

      setEditingContribution(null)
      setMessage("Contribution modifiée avec succès.")

      await loadContributions()
    } catch (error) {
      console.error(error)
      setMessage("Erreur réseau pendant la modification.")
    }
  }

  function openCancelModal(contribution: Contribution) {
    setCancelContribution(contribution)
    setCancelReason("")
  }

  async function handleCancelContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!cancelContribution) return

    if (!cancelReason.trim()) {
      setMessage("Le motif d’annulation est obligatoire.")
      return
    }

    try {
      const response = await fetch(
        `/api/contributions/${cancelContribution.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancelReason,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Impossible d’annuler la contribution.")
        return
      }

      setCancelContribution(null)
      setMessage("Contribution annulée avec succès.")

      await loadContributions()
    } catch (error) {
      console.error(error)
      setMessage("Erreur réseau pendant l’annulation.")
    }
  }

  const activeCount = useMemo(
    () => contributions.filter((item) => item.status === "active").length,
    [contributions]
  )

  const cancelledCount = useMemo(
    () => contributions.filter((item) => item.status === "cancelled").length,
    [contributions]
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-4xl font-bold">Gestion des contributions</h1>
        <p className="text-gray-600">
          Affichage, ajout, modification et annulation sécurisée des
          contributions historiques.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Lignes affichées</p>
          <p className="mt-2 text-3xl font-bold">{summary.displayedCount}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Total actif affiché</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {formatAmount(summary.activeTotal)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Total annulé affiché</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {formatAmount(summary.cancelledTotal)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Statuts dans la liste</p>
          <p className="mt-2 text-lg font-bold">
            {activeCount} actifs / {cancelledCount} annulés
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Ajouter une contribution</h2>

        <form
          onSubmit={handleCreateContribution}
          className="grid gap-4 md:grid-cols-2"
        >
          <input
            className="rounded-xl border p-3"
            placeholder="Nom du contributeur"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Montant en Ariary"
            type="number"
            min="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <select
            className="rounded-xl border p-3"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            {paymentMethods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>

          <input
            className="rounded-xl border p-3"
            type="datetime-local"
            value={contributionDate}
            onChange={(event) => setContributionDate(event.target.value)}
          />

          <textarea
            className="rounded-xl border p-3 md:col-span-2"
            placeholder="Commentaire"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <div className="md:col-span-2">
            <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
              Ajouter la contribution
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Liste des contributions</h2>
            <p className="text-sm text-gray-600">
              Les contributions annulées sont conservées dans l’historique mais
              exclues du total officiel.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <select
              className="rounded-xl border p-3"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="active">Actives</option>
              <option value="cancelled">Annulées</option>
              <option value="all">Toutes</option>
            </select>

            <select
              className="rounded-xl border p-3"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Tous types</option>
              <option value="normal">Normal</option>
              <option value="iray_volana">Iray Volana</option>
            </select>

            <input
              className="rounded-xl border p-3"
              placeholder="Rechercher un nom"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  loadContributions()
                }
              }}
            />

            <button
              type="button"
              onClick={loadContributions}
              className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
            >
              Actualiser
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="p-3">Date</th>
                <th className="p-3">Nom affiché</th>
                <th className="p-3">Montant</th>
                <th className="p-3">Type</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4" colSpan={7}>
                    Chargement...
                  </td>
                </tr>
              ) : contributions.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={7}>
                    Aucune contribution trouvée.
                  </td>
                </tr>
              ) : (
                contributions.map((contribution) => (
                  <tr
                    key={contribution.id}
                    className={
                      contribution.status === "cancelled"
                        ? "rounded-xl bg-red-50 text-gray-500"
                        : "rounded-xl bg-gray-50"
                    }
                  >
                    <td className="p-3 align-top">
                      {formatDate(contribution.contribution_date)}
                    </td>

                    <td className="p-3 align-top">
                      <p className="font-semibold">
                        {getDisplayName(contribution)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Opérateur : {contribution.operator_name || "—"}
                      </p>
                    </td>

                    <td className="p-3 align-top font-bold">
                      {formatAmount(contribution.amount)}
                    </td>

                    <td className="p-3 align-top">
                      <p>{contribution.contribution_type || "normal"}</p>
                      <p className="text-xs text-gray-500">
                        {contribution.event_name || contribution.event_type}
                      </p>
                    </td>

                    <td className="p-3 align-top">
                      {contribution.payment_method || "—"}
                    </td>

                    <td className="p-3 align-top">
                      {contribution.status === "active" ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                          Active
                        </span>
                      ) : (
                        <div>
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                            Annulée
                          </span>
                          <p className="mt-2 text-xs">
                            {contribution.cancellation_reason}
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="p-3 align-top">
                      {contribution.status === "active" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(contribution)}
                            className="rounded-lg border px-3 py-2 font-semibold hover:bg-white"
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            onClick={() => openCancelModal(contribution)}
                            className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Aucune action
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleUpdateContribution}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="mb-4 text-2xl font-bold">
              Modifier la contribution
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Nom du contributeur"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Montant"
                type="number"
                min="1"
                value={editAmount}
                onChange={(event) => setEditAmount(event.target.value)}
              />

              <select
                className="rounded-xl border p-3"
                value={editPaymentMethod}
                onChange={(event) => setEditPaymentMethod(event.target.value)}
              >
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>

              <input
                className="rounded-xl border p-3"
                type="datetime-local"
                value={editContributionDate}
                onChange={(event) =>
                  setEditContributionDate(event.target.value)
                }
              />

              <textarea
                className="rounded-xl border p-3 md:col-span-2"
                placeholder="Commentaire"
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
              />

              <textarea
                className="rounded-xl border border-orange-300 p-3 md:col-span-2"
                placeholder="Motif obligatoire de modification"
                value={editReason}
                onChange={(event) => setEditReason(event.target.value)}
                required
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingContribution(null)}
                className="rounded-xl border px-5 py-3 font-semibold"
              >
                Fermer
              </button>

              <button className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
                Enregistrer la modification
              </button>
            </div>
          </form>
        </div>
      )}

      {cancelContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCancelContribution}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="mb-2 text-2xl font-bold text-red-700">
              Annuler cette contribution
            </h2>

            <p className="mb-4 text-sm text-gray-700">
              Cette action ne supprimera pas la ligne. Elle conservera une trace
              d’audit et retirera le montant du total officiel.
            </p>

            <div className="mb-4 rounded-xl bg-red-50 p-4">
              <p className="font-semibold">{getDisplayName(cancelContribution)}</p>
              <p>{formatAmount(cancelContribution.amount)}</p>
              <p className="text-sm text-gray-500">
                {formatDate(cancelContribution.contribution_date)}
              </p>
            </div>

            <textarea
              className="w-full rounded-xl border border-red-300 p-3"
              placeholder="Motif obligatoire d’annulation"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              required
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelContribution(null)}
                className="rounded-xl border px-5 py-3 font-semibold"
              >
                Fermer
              </button>

              <button className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">
                Confirmer l’annulation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}