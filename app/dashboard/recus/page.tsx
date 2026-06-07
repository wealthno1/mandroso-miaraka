"use client"

import { useEffect, useMemo, useState } from "react"

type ReceiptView = {
  id: string | null
  receipt_number: number
  receipt_number_display: string
  status: string
  registry_created: boolean
  foana_reason: string | null
  foana_at: string | null
  used_at: string | null
  payment_amount: number | string | null
  payment_status: string | null
  payment_operator: string | null
  payment_paid_at: string | null
}

type ReceiptBookView = {
  id: string
  book_number: number
  receipt_count: number
  start_receipt_number: number
  end_receipt_number: number
  responsible_name: string | null
  status: string
  used_count: number
  foana_count: number
  voided_count: number
  available_count: number
  receipts: ReceiptView[]
}

type RecusResponse = {
  books: ReceiptBookView[]
  totals: {
    books: number
    receipts: number
    used: number
    foana: number
    voided: number
    available: number
  }
}

function formatAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "-"
  return `${Number(value).toLocaleString("fr-FR")} Ar`
}

function formatBookNumber(value: number) {
  return String(value).padStart(2, "0")
}

function getStatusLabel(status: string) {
  if (status === "used") return "Utilise"
  if (status === "foana") return "FOANA"
  if (status === "voided") return "Voided"
  if (status === "available") return "Disponible"
  return status
}

function getStatusClass(status: string) {
  if (status === "used") return "bg-green-100 text-green-800"
  if (status === "foana") return "bg-red-100 text-red-800"
  if (status === "voided") return "bg-gray-200 text-gray-800"
  return "bg-blue-50 text-blue-800"
}

export default function RecusPage() {
  const [books, setBooks] = useState<ReceiptBookView[]>([])
  const [totals, setTotals] = useState<RecusResponse["totals"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/recus", {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les recus.")
      }

      setBooks(payload.books ?? [])
      setTotals(payload.totals ?? null)
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Erreur lors du chargement des carnets."

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredBooks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return books
      .map((book) => {
        const receipts = book.receipts.filter((receipt) => {
          const matchesStatus =
            statusFilter === "all" || receipt.status === statusFilter

          const matchesSearch =
            !normalizedSearch ||
            receipt.receipt_number_display
              .toLowerCase()
              .includes(normalizedSearch) ||
            String(book.book_number).includes(normalizedSearch) ||
            (book.responsible_name || "")
              .toLowerCase()
              .includes(normalizedSearch)

          return matchesStatus && matchesSearch
        })

        return {
          ...book,
          receipts,
        }
      })
      .filter((book) => book.receipts.length > 0 || !normalizedSearch)
  }, [books, search, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Carnets / Recus</h1>
          <p className="mt-2 text-sm text-gray-600">
            Suivi des carnets de 25 recus : utilises, disponibles, FOANA et
            voided.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="rounded-xl bg-gray-900 px-5 py-3 font-bold text-white hover:bg-gray-800"
        >
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-100 p-4 font-medium text-red-800">
          {error}
        </div>
      ) : null}

      {totals ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-600">Carnets</p>
            <p className="text-3xl font-bold">{totals.books}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-600">Recus total</p>
            <p className="text-3xl font-bold">{totals.receipts}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-600">Utilises</p>
            <p className="text-3xl font-bold text-green-700">{totals.used}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-600">FOANA</p>
            <p className="text-3xl font-bold text-red-700">{totals.foana}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-600">Disponibles</p>
            <p className="text-3xl font-bold text-blue-700">
              {totals.available}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-600">Voided</p>
            <p className="text-3xl font-bold text-gray-700">
              {totals.voided}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Recherche recu, carnet ou responsable"
          className="min-w-64 flex-1 rounded-lg border p-3"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border p-3"
        >
          <option value="all">Tous les statuts</option>
          <option value="available">Disponibles</option>
          <option value="used">Utilises</option>
          <option value="foana">FOANA</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow">
          Chargement des carnets...
        </div>
      ) : null}

      {!loading && filteredBooks.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow">
          Aucun carnet trouve.
        </div>
      ) : null}

      <div className="space-y-6">
        {filteredBooks.map((book) => (
          <section key={book.id} className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Carnet {formatBookNumber(book.book_number)}
                </h2>
                <p className="text-sm text-gray-600">
                  Plage {String(book.start_receipt_number).padStart(3, "0")} a{" "}
                  {String(book.end_receipt_number).padStart(3, "0")} | Responsable :{" "}
                  {book.responsible_name || "-"} | Statut : {book.status}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-green-50 p-2 text-green-800">
                  Utilises<br />
                  <strong>{book.used_count}</strong>
                </div>
                <div className="rounded-lg bg-red-50 p-2 text-red-800">
                  FOANA<br />
                  <strong>{book.foana_count}</strong>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 text-blue-800">
                  Disponibles<br />
                  <strong>{book.available_count}</strong>
                </div>
                <div className="rounded-lg bg-gray-100 p-2 text-gray-800">
                  Voided<br />
                  <strong>{book.voided_count}</strong>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Recu</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Montant</th>
                    <th className="p-3">Operateur</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Motif FOANA</th>
                  </tr>
                </thead>

                <tbody>
                  {book.receipts.map((receipt) => (
                    <tr key={receipt.receipt_number} className="border-b">
                      <td className="p-3 font-bold">
                        {receipt.receipt_number_display}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            receipt.status
                          )}`}
                        >
                          {getStatusLabel(receipt.status)}
                        </span>
                      </td>

                      <td className="p-3">
                        {formatAmount(receipt.payment_amount)}
                      </td>

                      <td className="p-3">
                        {receipt.payment_operator || "-"}
                      </td>

                      <td className="p-3">
                        {receipt.payment_paid_at
                          ? new Date(receipt.payment_paid_at).toLocaleString(
                              "fr-FR"
                            )
                          : receipt.used_at
                            ? new Date(receipt.used_at).toLocaleString("fr-FR")
                            : "-"}
                      </td>

                      <td className="p-3">
                        {receipt.foana_reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
