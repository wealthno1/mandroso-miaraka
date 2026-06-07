import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RECEIPTS_PER_BOOK = 25

type CreateEnvelopeRequest = {
  action: "create_envelope"
  envelopeNumber?: string
  beneficiaryName?: string
  phone?: string
  distributedBy?: string
  isAnonymous?: boolean
  notes?: string
}

type CreatePaymentRequest = {
  action: "create_payment"
  envelopeNumber?: string
  amount?: number
  receiptNumber?: string
  paymentMethod?: string
  isClosingPayment?: boolean
  operatorName?: string
  notes?: string
  prayerText?: string
  confidentiality?: string
  responsibleName?: string
}

type UpdateEnvelopeRequest = {
  action: "update_envelope"
  envelopeId?: string
  beneficiaryName?: string
  phone?: string
  distributedBy?: string
  isAnonymous?: boolean
  notes?: string
  status?: string
}

type RequestBody =
  | CreateEnvelopeRequest
  | CreatePaymentRequest
  | UpdateEnvelopeRequest

function getCampaignId() {
  return process.env.IRAY_VOLANA_CAMPAIGN_ID
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeEnvelopeNumber(value: unknown) {
  const raw = String(value ?? "").trim()

  if (!/^[0-9]{1,4}$/.test(raw)) {
    throw new Error("Le numero d'enveloppe doit contenir 1 a 4 chiffres.")
  }

  const numberValue = Number(raw)

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error("Le numero d'enveloppe doit etre superieur a zero.")
  }

  return raw.padStart(4, "0")
}

function normalizeReceiptNumber(value: unknown) {
  const raw = String(value ?? "").trim()

  if (!/^[0-9]+$/.test(raw)) {
    throw new Error("Le numero de recu doit etre numerique.")
  }

  const numberValue = Number(raw)

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error("Le numero de recu doit etre superieur a zero.")
  }

  return numberValue
}

function getReceiptBookInfo(receiptNumber: number) {
  const bookNumber = Math.ceil(receiptNumber / RECEIPTS_PER_BOOK)
  const startReceiptNumber = (bookNumber - 1) * RECEIPTS_PER_BOOK + 1
  const endReceiptNumber = bookNumber * RECEIPTS_PER_BOOK

  return {
    bookNumber,
    startReceiptNumber,
    endReceiptNumber,
  }
}

function getFinalCategory(amount: number) {
  if (amount <= 50000) return "VALOPY VY"
  if (amount <= 100000) return "VARAHINA"
  if (amount <= 150000) return "BRONZE"
  if (amount <= 200000) return "VOLAFOTSY"
  if (amount <= 250000) return "VOLAMENA"
  if (amount <= 300000) return "PLATININA"
  return "DIAMONDRA"
}

async function ensureReceiptBook({
  supabase,
  campaignId,
  receiptNumber,
  responsibleName,
  adminEmail,
}: {
  supabase: ReturnType<typeof createAdminClient>
  campaignId: string
  receiptNumber: number
  responsibleName: string | null
  adminEmail: string
}) {
  const { bookNumber, startReceiptNumber, endReceiptNumber } =
    getReceiptBookInfo(receiptNumber)

  const { data: existingBook, error: existingBookError } = await supabase
    .from("receipt_books")
    .select("id, book_number, start_receipt_number, end_receipt_number")
    .eq("campaign_id", campaignId)
    .eq("book_number", bookNumber)
    .maybeSingle()

  if (existingBookError) {
    throw new Error(`Impossible de verifier le carnet : ${existingBookError.message}`)
  }

  if (existingBook) {
    return existingBook
  }

  const { data: newBook, error: newBookError } = await supabase
    .from("receipt_books")
    .insert({
      campaign_id: campaignId,
      book_number: bookNumber,
      receipt_count: RECEIPTS_PER_BOOK,
      start_receipt_number: startReceiptNumber,
      end_receipt_number: endReceiptNumber,
      responsible_name: responsibleName || "Responsable non precise",
      assigned_at: new Date().toISOString().slice(0, 10),
      status: "assigned",
      created_by: adminEmail,
      updated_by: adminEmail,
    })
    .select("id, book_number, start_receipt_number, end_receipt_number")
    .single()

  if (newBookError) {
    throw new Error(`Impossible de creer le carnet : ${newBookError.message}`)
  }

  return newBook
}

async function ensureAvailableReceipt({
  supabase,
  campaignId,
  receiptNumber,
  responsibleName,
  adminEmail,
}: {
  supabase: ReturnType<typeof createAdminClient>
  campaignId: string
  receiptNumber: number
  responsibleName: string | null
  adminEmail: string
}) {
  const book = await ensureReceiptBook({
    supabase,
    campaignId,
    receiptNumber,
    responsibleName,
    adminEmail,
  })

  const { data: existingReceipt, error: existingReceiptError } = await supabase
    .from("receipt_registry")
    .select("id, receipt_number, receipt_number_display, status")
    .eq("campaign_id", campaignId)
    .eq("receipt_number", receiptNumber)
    .maybeSingle()

  if (existingReceiptError) {
    throw new Error(`Impossible de verifier le recu : ${existingReceiptError.message}`)
  }

  if (existingReceipt) {
    if (existingReceipt.status !== "available") {
      throw new Error(
        `Le recu ${existingReceipt.receipt_number_display} n'est pas disponible. Statut actuel : ${existingReceipt.status}.`
      )
    }

    return existingReceipt
  }

  const receiptDisplay = String(receiptNumber).padStart(3, "0")

  const { data: newReceipt, error: newReceiptError } = await supabase
    .from("receipt_registry")
    .insert({
      campaign_id: campaignId,
      receipt_book_id: book.id,
      receipt_number: receiptNumber,
      internal_code: `VF-2026-R-${receiptDisplay}`,
      status: "available",
      created_by: adminEmail,
      updated_by: adminEmail,
    })
    .select("id, receipt_number, receipt_number_display, status")
    .single()

  if (newReceiptError) {
    throw new Error(`Impossible de creer le recu : ${newReceiptError.message}`)
  }

  return newReceipt
}

export async function GET() {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser?.email) {
      return jsonError("Acces administrateur requis.", 403)
    }

    const campaignId = getCampaignId()

    if (!campaignId) {
      return jsonError("IRAY_VOLANA_CAMPAIGN_ID n'est pas configure.", 500)
    }

    const supabase = createAdminClient()

    const { data: envelopes, error: envelopesError } = await supabase
      .from("faith_envelopes")
      .select(
        [
          "id",
          "campaign_id",
          "envelope_number",
          "beneficiary_name",
          "beneficiary_type",
          "phone",
          "distributed_by",
          "distributed_at",
          "is_anonymous",
          "status",
          "total_paid",
          "final_category",
          "has_prayer_request",
          "notes",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("campaign_id", campaignId)
      .order("envelope_number", { ascending: true })
      .limit(1000)

    if (envelopesError) {
      return jsonError(
        `Impossible de charger les enveloppes : ${envelopesError.message}`,
        500
      )
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("faith_envelope_payments")
      .select(
        [
          "id",
          "campaign_id",
          "envelope_id",
          "receipt_registry_id",
          "amount",
          "payment_method",
          "paid_at",
          "is_closing_payment",
          "operator_name",
          "notes",
          "status",
          "created_at",
        ].join(", ")
      )
      .eq("campaign_id", campaignId)
      .order("paid_at", { ascending: false })
      .limit(50)

    if (paymentsError) {
      return jsonError(
        `Impossible de charger les paiements : ${paymentsError.message}`,
        500
      )
    }

    type PaymentRow = {
      id: string
      receipt_registry_id: string | null
      [key: string]: unknown
    }

    type ReceiptRow = {
      id: string
      receipt_book_id: string | null
      receipt_number: number
      receipt_number_display: string
      status: string
    }

    type ReceiptBookRow = {
      id: string
      book_number: number
      responsible_name: string | null
    }

    const paymentRows = (payments ?? []) as unknown as PaymentRow[]
    const receiptIds = Array.from(
      new Set(
        paymentRows
          .map((payment) => payment.receipt_registry_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    const receiptsById = new Map<
      string,
      ReceiptRow & { receipt_book: ReceiptBookRow | null }
    >()

    if (receiptIds.length > 0) {
      const { data: receipts, error: receiptsError } = await supabase
        .from("receipt_registry")
        .select("id, receipt_book_id, receipt_number, receipt_number_display, status")
        .in("id", receiptIds)

      if (receiptsError) {
        return jsonError(
          `Impossible de charger les recus : ${receiptsError.message}`,
          500
        )
      }

      const receiptRows = (receipts ?? []) as unknown as ReceiptRow[]
      const bookIds = Array.from(
        new Set(
          receiptRows
            .map((receipt) => receipt.receipt_book_id)
            .filter((id): id is string => Boolean(id))
        )
      )

      const booksById = new Map<string, ReceiptBookRow>()

      if (bookIds.length > 0) {
        const { data: books, error: booksError } = await supabase
          .from("receipt_books")
          .select("id, book_number, responsible_name")
          .in("id", bookIds)

        if (booksError) {
          return jsonError(
            `Impossible de charger les carnets : ${booksError.message}`,
            500
          )
        }

        ;((books ?? []) as unknown as ReceiptBookRow[]).forEach((book) => {
          booksById.set(book.id, book)
        })
      }

      receiptRows.forEach((receipt) => {
        receiptsById.set(receipt.id, {
          ...receipt,
          receipt_book: receipt.receipt_book_id
            ? booksById.get(receipt.receipt_book_id) ?? null
            : null,
        })
      })
    }

    const enrichedPayments = paymentRows.map((payment) => ({
      ...payment,
      receipt_registry: payment.receipt_registry_id
        ? receiptsById.get(payment.receipt_registry_id) ?? null
        : null,
    }))

    return NextResponse.json({
      envelopes: envelopes ?? [],
      payments: enrichedPayments,
    })
  } catch (error) {
    console.error("Erreur API enveloppes GET :", error)

    return jsonError("Erreur interne lors du chargement des enveloppes.", 500)
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser?.email) {
      return jsonError("Acces administrateur requis.", 403)
    }

    const campaignId = getCampaignId()

    if (!campaignId) {
      return jsonError("IRAY_VOLANA_CAMPAIGN_ID n'est pas configure.", 500)
    }

    const body = (await request.json()) as RequestBody
    const supabase = createAdminClient()

    if (body.action === "create_envelope") {
      const envelopeNumber = normalizeEnvelopeNumber(body.envelopeNumber)
      const isAnonymous = Boolean(body.isAnonymous)
      const beneficiaryName = isAnonymous
        ? body.beneficiaryName?.trim() || "TSY MITONONA ANARANA"
        : body.beneficiaryName?.trim() || null

      const { data, error } = await supabase
        .from("faith_envelopes")
        .insert({
          campaign_id: campaignId,
          envelope_number: envelopeNumber,
          beneficiary_name: beneficiaryName,
          beneficiary_type: isAnonymous ? "anonymous" : "person",
          phone: body.phone?.trim() || null,
          distributed_by: body.distributedBy?.trim() || null,
          distributed_at: new Date().toISOString().slice(0, 10),
          is_anonymous: isAnonymous,
          status: "distributed",
          notes: body.notes?.trim() || null,
          created_by: adminUser.email,
          updated_by: adminUser.email,
        })
        .select()
        .single()

      if (error) {
        return jsonError(`Impossible d'ajouter l'enveloppe : ${error.message}`, 400)
      }

      return NextResponse.json(
        {
          success: true,
          message: `Enveloppe ${envelopeNumber} ajoutee.`,
          envelope: data,
        },
        { status: 201 }
      )
    }


    if (body.action === "update_envelope") {
      const envelopeId = body.envelopeId?.trim() || ""

      if (!envelopeId) {
        return jsonError("Identifiant enveloppe manquant.", 400)
      }

      const allowedStatuses = [
        "distributed",
        "in_progress",
        "closed",
        "cancelled",
      ]

      const status = body.status?.trim() || "distributed"

      if (!allowedStatuses.includes(status)) {
        return jsonError("Statut enveloppe invalide.", 400)
      }

      const isAnonymous = Boolean(body.isAnonymous)
      const beneficiaryName = body.beneficiaryName?.trim() || null

      const { data, error } = await supabase
        .from("faith_envelopes")
        .update({
          beneficiary_name:
            beneficiaryName || (isAnonymous ? "TSY MITONONA ANARANA" : null),
          beneficiary_type: isAnonymous ? "anonymous" : "person",
          phone: body.phone?.trim() || null,
          distributed_by: body.distributedBy?.trim() || null,
          is_anonymous: isAnonymous,
          status,
          notes: body.notes?.trim() || null,
          updated_by: adminUser.email,
        })
        .eq("id", envelopeId)
        .eq("campaign_id", campaignId)
        .select()
        .single()

      if (error) {
        return jsonError(
          `Impossible de modifier l'enveloppe : ${error.message}`,
          400
        )
      }

      return NextResponse.json({
        success: true,
        message: `Enveloppe ${data.envelope_number} modifiee.`,
        envelope: data,
      })
    }

    if (body.action === "create_payment") {
      const envelopeNumber = normalizeEnvelopeNumber(body.envelopeNumber)
      const receiptNumber = normalizeReceiptNumber(body.receiptNumber)
      const amount = Number(body.amount)

      if (!Number.isFinite(amount) || amount <= 0) {
        return jsonError("Le montant doit etre strictement superieur a zero.")
      }

      const paymentMethod = body.paymentMethod?.trim() || "cash"

      if (
        !["cash", "mvola", "orange_money", "transfer", "check", "other"].includes(
          paymentMethod
        )
      ) {
        return jsonError("Mode de paiement invalide.")
      }

      const { data: envelope, error: envelopeError } = await supabase
        .from("faith_envelopes")
        .select("id, status, total_paid")
        .eq("campaign_id", campaignId)
        .eq("envelope_number", envelopeNumber)
        .maybeSingle()

      if (envelopeError) {
        return jsonError(
          `Impossible de verifier l'enveloppe : ${envelopeError.message}`,
          500
        )
      }

      if (!envelope) {
        return jsonError(
          `L'enveloppe ${envelopeNumber} n'existe pas encore. Ajoutez d'abord l'enveloppe.`,
          404
        )
      }

      if (envelope.status === "cancelled") {
        return jsonError(`L'enveloppe ${envelopeNumber} est annulee.`, 400)
      }

      const receipt = await ensureAvailableReceipt({
        supabase,
        campaignId,
        receiptNumber,
        responsibleName: body.responsibleName?.trim() || null,
        adminEmail: adminUser.email,
      })

      const { data: payment, error: paymentError } = await supabase
        .from("faith_envelope_payments")
        .insert({
          campaign_id: campaignId,
          envelope_id: envelope.id,
          receipt_registry_id: receipt.id,
          amount,
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          is_closing_payment: Boolean(body.isClosingPayment),
          operator_name: body.operatorName?.trim() || adminUser.email,
          notes: body.notes?.trim() || null,
          status: "active",
          created_by: adminUser.email,
          updated_by: adminUser.email,
        })
        .select()
        .single()

      if (paymentError) {
        return jsonError(`Impossible de saisir le paiement : ${paymentError.message}`, 400)
      }

      const { error: receiptUpdateError } = await supabase
        .from("receipt_registry")
        .update({
          status: "used",
          used_at: new Date().toISOString(),
          updated_by: adminUser.email,
        })
        .eq("id", receipt.id)

      if (receiptUpdateError) {
        return jsonError(
          `Paiement cree, mais impossible de marquer le recu comme utilise : ${receiptUpdateError.message}`,
          500
        )
      }

      const prayerText = body.prayerText?.trim() || ""

      if (prayerText) {
        const confidentiality =
          body.confidentiality === "pastor" ? "pastor" : "internal"

        const { error: prayerError } = await supabase
          .from("faith_envelope_prayers")
          .insert({
            campaign_id: campaignId,
            envelope_id: envelope.id,
            payment_id: payment.id,
            prayer_text: prayerText,
            confidentiality,
            created_by: adminUser.email,
          })

        if (prayerError) {
          return jsonError(
            `Paiement cree, mais impossible d'ajouter la priere : ${prayerError.message}`,
            500
          )
        }
      }

      const { data: refreshedEnvelope } = await supabase
        .from("faith_envelopes")
        .select("id, total_paid, status")
        .eq("id", envelope.id)
        .single()

      const totalPaid = Number(refreshedEnvelope?.total_paid ?? amount)

      if (body.isClosingPayment) {
        await supabase
          .from("faith_envelopes")
          .update({
            status: "closed",
            final_category: getFinalCategory(totalPaid),
            updated_by: adminUser.email,
          })
          .eq("id", envelope.id)
      } else if (refreshedEnvelope?.status === "distributed") {
        await supabase
          .from("faith_envelopes")
          .update({
            status: "in_progress",
            updated_by: adminUser.email,
          })
          .eq("id", envelope.id)
      }

      return NextResponse.json(
        {
          success: true,
          message: `Paiement de ${amount.toLocaleString("fr-FR")} Ar saisi sur l'enveloppe ${envelopeNumber}.`,
          payment,
        },
        { status: 201 }
      )
    }

    return jsonError("Action inconnue.", 400)
  } catch (error) {
    console.error("Erreur API enveloppes POST :", error)

    const message =
      error instanceof Error
        ? error.message
        : "Erreur interne lors de l'operation sur les enveloppes."

    return jsonError(message, 500)
  }
}
