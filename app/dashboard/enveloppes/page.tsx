"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type Envelope = {
  id: string
  envelope_number: string
  beneficiary_name: string | null
  phone: string | null
  distributed_by: string | null
  status: string
  total_paid: number | string
  has_prayer_request: boolean
  is_anonymous: boolean
  notes: string | null
}

type Payment = {
  id: string
  envelope_id: string
  amount: number | string
  payment_method: string | null
  paid_at: string | null
  status: string
  operator_name: string | null
}

const paymentMethods = [
  { value: "cash", label: "Especes" },
  { value: "mvola", label: "MVola" },
  { value: "orange_money", label: "Orange Money" },
  { value: "transfer", label: "Virement" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Autre" },
]

function formatAmount(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("fr-FR")} Ar`
}

function normalizeEnvelopeInput(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return ""

  if (!/^[0-9]{1,4}$/.test(trimmed)) return trimmed

  return trimmed.padStart(4, "0")
}

export default function EnveloppesPage() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [envelopeNumber, setEnvelopeNumber] = useState("")
  const [beneficiaryName, setBeneficiaryName] = useState("")
  const [phone, setPhone] = useState("")
  const [distributedBy, setDistributedBy] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [envelopeNotes, setEnvelopeNotes] = useState("")

  const [paymentEnvelopeNumber, setPaymentEnvelopeNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [isClosingPayment, setIsClosingPayment] = useState(false)
  const [operatorName, setOperatorName] = useState("")
  const [responsibleName, setResponsibleName] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [prayerText, setPrayerText] = useState("")
  const [confidentiality, setConfidentiality] = useState("internal")

  async function loadData() {
    setLoadingList(true)
    setError("")

    try {
      const response = await fetch("/api/enveloppes", {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les enveloppes.")
      }

      setEnvelopes(payload.envelopes || [])
      setPayments(payload.payments || [])
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Erreur de chargement des enveloppes."

      setError(message)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredEnvelopes = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return envelopes

    return envelopes.filter((envelope) => {
      return [
        envelope.envelope_number,
        envelope.beneficiary_name || "",
        envelope.phone || "",
        envelope.distributed_by || "",
        envelope.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    })
  }, [envelopes, search])

  const totalPaid = envelopes.reduce(
    (sum, envelope) => sum + Number(envelope.total_paid || 0),
    0
  )

  async function submitEnvelope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) return

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/enveloppes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_envelope",
          envelopeNumber: normalizeEnvelopeInput(envelopeNumber),
          beneficiaryName,
          phone,
          distributedBy,
          isAnonymous,
          notes: envelopeNotes,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'ajouter l'enveloppe.")
      }

      setMessage(payload.message || "Enveloppe ajoutee.")
      setEnvelopeNumber("")
      setBeneficiaryName("")
      setPhone("")
      setDistributedBy("")
      setIsAnonymous(false)
      setEnvelopeNotes("")

      await loadData()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de l'ajout de l'enveloppe."

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) return

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/enveloppes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_payment",
          envelopeNumber: normalizeEnvelopeInput(paymentEnvelopeNumber),
          amount: Number(amount),
          receiptNumber,
          paymentMethod,
          isClosingPayment,
          operatorName,
          notes: paymentNotes,
          prayerText,
          confidentiality,
          responsibleName,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de saisir le paiement.")
      }

      setMessage(payload.message || "Paiement saisi.")
      setPaymentEnvelopeNumber("")
      setAmount("")
      setReceiptNumber("")
      setPaymentMethod("cash")
      setIsClosingPayment(false)
      setPaymentNotes("")
      setPrayerText("")

      await loadData()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de la saisie du paiement."

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Enveloppes Valopy Finoana</h1>
        <p className="mt-2 text-gray-600">
          Saisie des enveloppes distribuees, recus papier, paiements et demandes
          de priere confidentielles.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={submitEnvelope} className="space-y-4 rounded-2xl bg-white p-6 shadow">
          <div>
            <h2 className="text-2xl font-bold">Ajouter une enveloppe</h2>
            <p className="text-sm text-gray-600">
              A faire une seule fois par numero d'enveloppe.
            </p>
          </div>

          <input
            value={envelopeNumber}
            onChange={(event) => setEnvelopeNumber(event.target.value)}
            placeholder="Numero enveloppe ex: 1, 25, 0300"
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            value={beneficiaryName}
            onChange={(event) => setBeneficiaryName(event.target.value)}
            placeholder="Nom beneficiaire / famille / groupe"
            className="w-full rounded-lg border p-3"
          />

          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Telephone"
            className="w-full rounded-lg border p-3"
          />

          <input
            value={distributedBy}
            onChange={(event) => setDistributedBy(event.target.value)}
            placeholder="Distribue par"
            className="w-full rounded-lg border p-3"
          />

          <textarea
            value={envelopeNotes}
            onChange={(event) => setEnvelopeNotes(event.target.value)}
            placeholder="Observation interne"
            className="min-h-20 w-full rounded-lg border p-3"
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />
            <span>Tsy mitonona anarana / Anonyme</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Enregistrement..." : "Ajouter l'enveloppe"}
          </button>
        </form>

        <form onSubmit={submitPayment} className="space-y-4 rounded-2xl bg-white p-6 shadow">
          <div>
            <h2 className="text-2xl font-bold">Saisir un paiement</h2>
            <p className="text-sm text-gray-600">
              Le carnet et le recu sont crees automatiquement si necessaire.
            </p>
          </div>

          <input
            value={paymentEnvelopeNumber}
            onChange={(event) => setPaymentEnvelopeNumber(event.target.value)}
            placeholder="Numero enveloppe existante ex: 0001"
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Montant recu"
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            value={receiptNumber}
            onChange={(event) => setReceiptNumber(event.target.value)}
            placeholder="Numero recu papier ex: 001"
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            value={responsibleName}
            onChange={(event) => setResponsibleName(event.target.value)}
            placeholder="Responsable du carnet"
            className="w-full rounded-lg border p-3"
          />

          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="w-full rounded-lg border p-3"
          >
            {paymentMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          <input
            value={operatorName}
            onChange={(event) => setOperatorName(event.target.value)}
            placeholder="Operateur de saisie"
            className="w-full rounded-lg border p-3"
          />

          <textarea
            value={paymentNotes}
            onChange={(event) => setPaymentNotes(event.target.value)}
            placeholder="Observation paiement"
            className="min-h-20 w-full rounded-lg border p-3"
          />

          <textarea
            value={prayerText}
            onChange={(event) => setPrayerText(event.target.value)}
            placeholder="Demande de priere confidentielle, optionnel"
            className="min-h-24 w-full rounded-lg border p-3"
          />

          <select
            value={confidentiality}
            onChange={(event) => setConfidentiality(event.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="internal">Interne</option>
            <option value="pastor">Pasteur</option>
          </select>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isClosingPayment}
              onChange={(event) => setIsClosingPayment(event.target.checked)}
            />
            <span>Ce paiement cloture l'enveloppe</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Enregistrement..." : "Saisir le paiement"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Liste des enveloppes</h2>
            <p className="text-sm text-gray-600">
              {filteredEnvelopes.length} enveloppe(s) affichee(s) | Total
              versements : {formatAmount(totalPaid)}
            </p>
          </div>

          <div className="flex gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Recherche numero, nom, telephone, distributeur"
              className="w-full rounded-lg border p-3 lg:w-96"
            />

            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-gray-900 px-4 py-3 font-bold text-white"
            >
              Actualiser
            </button>
          </div>
        </div>

        {loadingList ? (
          <p>Chargement...</p>
        ) : filteredEnvelopes.length === 0 ? (
          <p className="text-gray-600">Aucune enveloppe trouvee.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-3">Numero</th>
                  <th className="p-3">Beneficiaire</th>
                  <th className="p-3">Telephone</th>
                  <th className="p-3">Distributeur</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Total paye</th>
                  <th className="p-3">Priere</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnvelopes.map((envelope) => (
                  <tr key={envelope.id} className="border-b">
                    <td className="p-3 font-bold">{envelope.envelope_number}</td>
                    <td className="p-3">
                      {envelope.is_anonymous
                        ? "TSY MITONONA ANARANA"
                        : envelope.beneficiary_name || "-"}
                    </td>
                    <td className="p-3">{envelope.phone || "-"}</td>
                    <td className="p-3">{envelope.distributed_by || "-"}</td>
                    <td className="p-3">{envelope.status}</td>
                    <td className="p-3 text-right font-bold text-green-700">
                      {formatAmount(envelope.total_paid)}
                    </td>
                    <td className="p-3">
                      {envelope.has_prayer_request ? "Oui" : "Non"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Derniers paiements</h2>

        {payments.length === 0 ? (
          <p className="text-gray-600">Aucun paiement saisi.</p>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 10).map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col justify-between gap-2 rounded-xl bg-gray-100 p-4 md:flex-row md:items-center"
              >
                <div>
                  <p className="font-bold">{formatAmount(payment.amount)}</p>
                  <p className="text-sm text-gray-600">
                    {payment.payment_method || "cash"} |{" "}
                    {payment.operator_name || "Operateur non precise"}
                  </p>
                </div>

                <div className="text-sm text-gray-600">
                  {payment.status} |{" "}
                  {payment.paid_at
                    ? new Date(payment.paid_at).toLocaleString("fr-FR")
                    : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
