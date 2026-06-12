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
  notes?: string | null
  is_closing_payment?: boolean | null
  receipt_registry?: {
    receipt_number: number | null
    receipt_number_display: string | null
    status: string | null
    receipt_book?: {
      book_number: number | null
      responsible_name: string | null
    } | null
  } | null
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

function formatBookNumber(value: number | null | undefined) {
  if (!value) return "-"
  return String(value).padStart(2, "0")
}

function formatReceiptNumber(value: number | string | null | undefined) {
  if (!value) return "-"
  return String(value).padStart(3, "0")
}

function getReceiptBookPreview(value: string) {
  const raw = value.trim()

  if (!raw) return ""

  if (!/^[0-9]+$/.test(raw)) {
    return "Numero de recu invalide."
  }

  const receiptNumber = Number(raw)

  if (!Number.isInteger(receiptNumber) || receiptNumber <= 0) {
    return "Numero de recu invalide."
  }

  const bookNumber = Math.ceil(receiptNumber / 25)
  const startReceiptNumber = (bookNumber - 1) * 25 + 1
  const endReceiptNumber = bookNumber * 25

  return `Recu ${formatReceiptNumber(receiptNumber)} -> Carnet ${formatBookNumber(
    bookNumber
  )} (plage ${formatReceiptNumber(startReceiptNumber)} a ${formatReceiptNumber(
    endReceiptNumber
  )})`
}

function getPaymentReceiptStatusLabel(status: string) {
  if (status === "used") return "utilise"
  if (status === "foana") return "FOANA"
  if (status === "voided") return "voided"
  if (status === "available") return "disponible"
  return status
}

function getReceiptLine(payment: Payment) {
  const receipt = payment.receipt_registry
  const book = receipt?.receipt_book

  if (!receipt) {
    return "Recu non renseigne"
  }

  return `Recu ${receipt.receipt_number_display || "-"} — Carnet ${formatBookNumber(
    book?.book_number
  )}`
}

function getReceiptResponsibleLine(payment: Payment) {
  const responsible = payment.receipt_registry?.receipt_book?.responsible_name

  return `Responsable carnet : ${responsible || "-"}`
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
  const [receiptStatusWarning, setReceiptStatusWarning] = useState("")
  const [checkingReceiptStatus, setCheckingReceiptStatus] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [isClosingPayment, setIsClosingPayment] = useState(false)
  const [operatorName, setOperatorName] = useState("")
  const [responsibleName, setResponsibleName] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [prayerText, setPrayerText] = useState("")
  const [confidentiality, setConfidentiality] = useState("internal")

  const [editingEnvelopeId, setEditingEnvelopeId] = useState("")
  const [editEnvelopeNumber, setEditEnvelopeNumber] = useState("")
  const [editBeneficiaryName, setEditBeneficiaryName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editDistributedBy, setEditDistributedBy] = useState("")
  const [editIsAnonymous, setEditIsAnonymous] = useState(false)
  const [editStatus, setEditStatus] = useState("distributed")
  const [editNotes, setEditNotes] = useState("")

  const [editingPaymentId, setEditingPaymentId] = useState("")
  const [editPaymentAmount, setEditPaymentAmount] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash")
  const [editPaymentOperatorName, setEditPaymentOperatorName] = useState("")
  const [editPaymentNotes, setEditPaymentNotes] = useState("")
  const [editPaymentIsClosingPayment, setEditPaymentIsClosingPayment] =
    useState(false)
  const [editPaymentReason, setEditPaymentReason] = useState("")
  const [editPaymentReceiptInfo, setEditPaymentReceiptInfo] = useState("")

  const [cancellingPaymentId, setCancellingPaymentId] = useState("")
  const [cancelPaymentAmount, setCancelPaymentAmount] = useState("")
  const [cancelPaymentReceiptInfo, setCancelPaymentReceiptInfo] = useState("")
  const [cancelPaymentReason, setCancelPaymentReason] = useState("")

  const [foanaReceiptNumber, setFoanaReceiptNumber] = useState("")
  const [foanaResponsibleName, setFoanaResponsibleName] = useState("")
  const [foanaReason, setFoanaReason] = useState("")

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

      showError(message)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function showError(errorMessage: string) {
    setError(errorMessage)

    if (typeof window !== "undefined") {
      window.alert(`❌ ${errorMessage}`)
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }

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

  const receiptBookPreview = useMemo(
    () => getReceiptBookPreview(receiptNumber),
    [receiptNumber]
  )

  const foanaReceiptBookPreview = useMemo(
    () => getReceiptBookPreview(foanaReceiptNumber),
    [foanaReceiptNumber]
  )

  useEffect(() => {
    const raw = receiptNumber.trim()

    setReceiptStatusWarning("")

    if (!raw) {
      setCheckingReceiptStatus(false)
      return
    }

    if (!/^[0-9]+$/.test(raw)) {
      setReceiptStatusWarning("Numero de recu invalide.")
      setCheckingReceiptStatus(false)
      return
    }

    const numericReceiptNumber = Number(raw)

    if (!Number.isInteger(numericReceiptNumber) || numericReceiptNumber <= 0) {
      setReceiptStatusWarning("Numero de recu invalide.")
      setCheckingReceiptStatus(false)
      return
    }

    let cancelled = false

    setCheckingReceiptStatus(true)

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/recus", {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || "Impossible de verifier le recu.")
        }

        const receipt = (payload.books || [])
          .flatMap((book: { receipts?: Array<{ receipt_number: number; receipt_number_display: string; status: string }> }) => book.receipts || [])
          .find((item: { receipt_number: number }) => item.receipt_number === numericReceiptNumber)

        if (cancelled) return

        if (receipt && receipt.status !== "available") {
          setReceiptStatusWarning(
            `Le recu ${receipt.receipt_number_display} n'est pas disponible. Statut actuel : ${getPaymentReceiptStatusLabel(receipt.status)}.`
          )
        } else {
          setReceiptStatusWarning("")
        }
      } catch {
        if (!cancelled) {
          setReceiptStatusWarning("")
        }
      } finally {
        if (!cancelled) {
          setCheckingReceiptStatus(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [receiptNumber])

  async function submitEnvelope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) return

    if (receiptStatusWarning) {
      showError(receiptStatusWarning)
      return
    }

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

      showError(message)
    } finally {
      setLoading(false)
    }
  }


  function startEditEnvelope(envelope: Envelope) {
    setEditingEnvelopeId(envelope.id)
    setEditEnvelopeNumber(envelope.envelope_number)
    setEditBeneficiaryName(envelope.beneficiary_name || "")
    setEditPhone(envelope.phone || "")
    setEditDistributedBy(envelope.distributed_by || "")
    setEditIsAnonymous(Boolean(envelope.is_anonymous))
    setEditStatus(envelope.status || "distributed")
    setEditNotes(envelope.notes || "")

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelEditEnvelope() {
    setEditingEnvelopeId("")
    setEditEnvelopeNumber("")
    setEditBeneficiaryName("")
    setEditPhone("")
    setEditDistributedBy("")
    setEditIsAnonymous(false)
    setEditStatus("distributed")
    setEditNotes("")
  }

  async function submitEditEnvelope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading || !editingEnvelopeId) return

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
          action: "update_envelope",
          envelopeId: editingEnvelopeId,
          beneficiaryName: editBeneficiaryName,
          phone: editPhone,
          distributedBy: editDistributedBy,
          isAnonymous: editIsAnonymous,
          status: editStatus,
          notes: editNotes,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de modifier l'enveloppe.")
      }

      setMessage(payload.message || "Enveloppe modifiee.")
      cancelEditEnvelope()
      await loadData()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de la modification de l'enveloppe."

      showError(message)
    } finally {
      setLoading(false)
    }
  }


  function startEditPayment(payment: Payment) {
    setEditingPaymentId(payment.id)
    setEditPaymentAmount(String(payment.amount || ""))
    setEditPaymentMethod(payment.payment_method || "cash")
    setEditPaymentOperatorName(payment.operator_name || "")
    setEditPaymentNotes(payment.notes || "")
    setEditPaymentIsClosingPayment(Boolean(payment.is_closing_payment))
    setEditPaymentReason("")
    setEditPaymentReceiptInfo(getReceiptLine(payment))

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelEditPayment() {
    setEditingPaymentId("")
    setEditPaymentAmount("")
    setEditPaymentMethod("cash")
    setEditPaymentOperatorName("")
    setEditPaymentNotes("")
    setEditPaymentIsClosingPayment(false)
    setEditPaymentReason("")
    setEditPaymentReceiptInfo("")
  }

  async function submitEditPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading || !editingPaymentId) return

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
          action: "update_payment",
          paymentId: editingPaymentId,
          amount: Number(editPaymentAmount),
          paymentMethod: editPaymentMethod,
          operatorName: editPaymentOperatorName,
          notes: editPaymentNotes,
          isClosingPayment: editPaymentIsClosingPayment,
          reason: editPaymentReason,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de modifier le paiement.")
      }

      setMessage(payload.message || "Paiement modifie.")
      cancelEditPayment()
      await loadData()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de la modification du paiement."

      showError(message)
    } finally {
      setLoading(false)
    }
  }


  function startCancelPayment(payment: Payment) {
    if (payment.status !== "active") {
      showError("Seul un paiement actif peut etre annule.")
      return
    }

    setCancellingPaymentId(payment.id)
    setCancelPaymentAmount(String(payment.amount || ""))
    setCancelPaymentReceiptInfo(getReceiptLine(payment))
    setCancelPaymentReason("")

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelCancelPayment() {
    setCancellingPaymentId("")
    setCancelPaymentAmount("")
    setCancelPaymentReceiptInfo("")
    setCancelPaymentReason("")
  }

  async function submitCancelPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading || !cancellingPaymentId) return

    const confirmed = window.confirm(
      "Confirmer l'annulation de ce paiement ? Le recu restera conserve et ne redeviendra pas disponible."
    )

    if (!confirmed) return

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
          action: "cancel_payment",
          paymentId: cancellingPaymentId,
          reason: cancelPaymentReason,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'annuler le paiement.")
      }

      setMessage(payload.message || "Paiement annule.")
      cancelCancelPayment()
      await loadData()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors de l'annulation du paiement."

      showError(message)
    } finally {
      setLoading(false)
    }
  }


  async function submitFoanaReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) return

    const confirmed = window.confirm(
      "Confirmer que ce recu est FOANA ? Aucun paiement ne sera cree et ce recu ne pourra plus etre utilise."
    )

    if (!confirmed) return

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
          action: "mark_receipt_foana",
          receiptNumber: foanaReceiptNumber,
          responsibleName: foanaResponsibleName,
          reason: foanaReason,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de marquer le recu FOANA.")
      }

      setMessage(payload.message || "Recu marque FOANA.")
      setFoanaReceiptNumber("")
      setFoanaResponsibleName("")
      setFoanaReason("")
      await loadData()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur lors du marquage FOANA."

      showError(message)
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

      showError(message)
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
        <div className="sticky top-16 z-30 rounded-xl border-2 border-red-500 bg-red-50 p-5 text-lg font-bold text-red-800 shadow-lg">
          ❌ {error}
        </div>
      ) : null}


      {editingEnvelopeId ? (
        <form
          onSubmit={submitEditEnvelope}
          className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow"
        >
          <div>
            <h2 className="text-2xl font-bold">
              Modifier l'enveloppe {editEnvelopeNumber}
            </h2>
            <p className="text-sm text-gray-600">
              Cette modification ne change pas les paiements deja saisis.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <input
              value={editBeneficiaryName}
              onChange={(event) => setEditBeneficiaryName(event.target.value)}
              placeholder="Nom interne beneficiaire / famille / groupe"
              className="w-full rounded-lg border p-3"
            />

            <input
              value={editPhone}
              onChange={(event) => setEditPhone(event.target.value)}
              placeholder="Telephone"
              className="w-full rounded-lg border p-3"
            />

            <input
              value={editDistributedBy}
              onChange={(event) => setEditDistributedBy(event.target.value)}
              placeholder="Distribue par"
              className="w-full rounded-lg border p-3"
            />

            <select
              value={editStatus}
              onChange={(event) => setEditStatus(event.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="distributed">distributed</option>
              <option value="in_progress">in_progress</option>
              <option value="closed">closed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <textarea
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            placeholder="Observation interne"
            className="min-h-20 w-full rounded-lg border p-3"
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={editIsAnonymous}
              onChange={(event) => setEditIsAnonymous(event.target.checked)}
            />
            <span>
              Tsy mitonona anarana / Anonyme publiquement
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Modification..." : "Enregistrer la modification"}
            </button>

            <button
              type="button"
              onClick={cancelEditEnvelope}
              className="rounded-xl bg-gray-200 px-5 py-3 font-bold text-gray-800 hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}


      {editingPaymentId ? (
        <form
          onSubmit={submitEditPayment}
          className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow"
        >
          <div>
            <h2 className="text-2xl font-bold">Modifier un paiement</h2>
            <p className="text-sm text-gray-600">
              Le recu reste attache au paiement. Cette correction recalculera le
              total de l'enveloppe et le total public.
            </p>
            <p className="mt-2 text-sm font-bold text-amber-800">
              {editPaymentReceiptInfo}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <input
              type="number"
              value={editPaymentAmount}
              onChange={(event) => setEditPaymentAmount(event.target.value)}
              placeholder="Montant corrige"
              className="w-full rounded-lg border p-3"
              required
            />

            <select
              value={editPaymentMethod}
              onChange={(event) => setEditPaymentMethod(event.target.value)}
              className="w-full rounded-lg border p-3"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <input
              value={editPaymentOperatorName}
              onChange={(event) => setEditPaymentOperatorName(event.target.value)}
              placeholder="Operateur de saisie"
              className="w-full rounded-lg border p-3"
            />
          </div>

          <textarea
            value={editPaymentNotes}
            onChange={(event) => setEditPaymentNotes(event.target.value)}
            placeholder="Observation paiement"
            className="min-h-20 w-full rounded-lg border p-3"
          />

          <textarea
            value={editPaymentReason}
            onChange={(event) => setEditPaymentReason(event.target.value)}
            placeholder="Motif obligatoire de correction"
            className="min-h-20 w-full rounded-lg border p-3"
            required
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={editPaymentIsClosingPayment}
              onChange={(event) =>
                setEditPaymentIsClosingPayment(event.target.checked)
              }
            />
            <span>Ce paiement cloture l'enveloppe</span>
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white hover:bg-amber-700 disabled:bg-gray-400"
            >
              {loading ? "Correction..." : "Enregistrer la correction"}
            </button>

            <button
              type="button"
              onClick={cancelEditPayment}
              className="rounded-xl bg-gray-200 px-5 py-3 font-bold text-gray-800 hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}


      {cancellingPaymentId ? (
        <form
          onSubmit={submitCancelPayment}
          className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 shadow"
        >
          <div>
            <h2 className="text-2xl font-bold text-red-800">
              Annuler un paiement
            </h2>
            <p className="text-sm text-gray-700">
              Cette operation ne supprime pas le paiement. Elle le passe en
              cancelled, garde le recu utilise et recalcule les totaux.
            </p>
            <p className="mt-2 text-sm font-bold text-red-800">
              {cancelPaymentReceiptInfo} — Montant : {formatAmount(cancelPaymentAmount)}
            </p>
          </div>

          <textarea
            value={cancelPaymentReason}
            onChange={(event) => setCancelPaymentReason(event.target.value)}
            placeholder="Motif obligatoire d'annulation"
            className="min-h-24 w-full rounded-lg border p-3"
            required
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              {loading ? "Annulation..." : "Confirmer l'annulation"}
            </button>

            <button
              type="button"
              onClick={cancelCancelPayment}
              className="rounded-xl bg-gray-200 px-5 py-3 font-bold text-gray-800 hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </form>
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


        <form
          onSubmit={submitFoanaReceipt}
          className="space-y-4 rounded-2xl bg-white p-6 shadow"
        >
          <div>
            <h2 className="text-2xl font-bold">Recu FOANA</h2>
            <p className="text-sm text-gray-600">
              A utiliser pour un recu abime, perdu ou inutilisable avant paiement.
              Aucun paiement ne sera cree.
            </p>
          </div>

          <input
            value={foanaReceiptNumber}
            onChange={(event) => setFoanaReceiptNumber(event.target.value)}
            placeholder="Numero recu FOANA ex: 004"
            className="w-full rounded-lg border p-3"
            required
          />

          {foanaReceiptBookPreview ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {foanaReceiptBookPreview}
            </div>
          ) : null}

          <input
            value={foanaResponsibleName}
            onChange={(event) => setFoanaResponsibleName(event.target.value)}
            placeholder="Responsable du carnet"
            className="w-full rounded-lg border p-3"
          />

          <textarea
            value={foanaReason}
            onChange={(event) => setFoanaReason(event.target.value)}
            placeholder="Motif obligatoire FOANA"
            className="min-h-24 w-full rounded-lg border p-3"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800 disabled:bg-gray-400"
          >
            {loading ? "Enregistrement..." : "Marquer recu FOANA"}
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

          {receiptBookPreview ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800">
              {receiptBookPreview}
            </div>
          ) : null}

          {checkingReceiptStatus ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-bold text-yellow-800">
              Verification du statut du recu...
            </div>
          ) : null}

          {receiptStatusWarning ? (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-3 text-sm font-bold text-red-800">
              ❌ {receiptStatusWarning}
            </div>
          ) : null}

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
            disabled={loading || checkingReceiptStatus || Boolean(receiptStatusWarning)}
            className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:bg-gray-400"
          >
            {checkingReceiptStatus
              ? "Verification recu..."
              : loading
                ? "Enregistrement..."
                : "Saisir le paiement"}
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
                  <th className="p-3">Actions</th>
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
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => startEditEnvelope(envelope)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        Modifier
                      </button>
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
                  <p>{getReceiptLine(payment)}</p>
                  <p>{getReceiptResponsibleLine(payment)}</p>
                  <p>
                    {payment.status} |{" "}
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleString("fr-FR")
                      : "-"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditPayment(payment)}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      Modifier paiement
                    </button>

                    {payment.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => startCancelPayment(payment)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                      >
                        Annuler paiement
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
