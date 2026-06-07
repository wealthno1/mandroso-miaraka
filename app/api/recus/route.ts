import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ReceiptBookRow = {
  id: string
  book_number: number
  receipt_count: number
  start_receipt_number: number
  end_receipt_number: number
  responsible_name: string | null
  status: string
  notes: string | null
  created_at: string | null
}

type ReceiptRow = {
  id: string
  receipt_book_id: string | null
  receipt_number: number
  receipt_number_display: string
  status: string
  foana_reason: string | null
  foana_at: string | null
  foana_by: string | null
  used_at: string | null
  updated_at: string | null
}

type PaymentRow = {
  id: string
  receipt_registry_id: string | null
  amount: number | string
  status: string
  paid_at: string | null
  operator_name: string | null
}

function getCampaignId() {
  return process.env.IRAY_VOLANA_CAMPAIGN_ID
}

function formatReceiptNumber(value: number) {
  return String(value).padStart(3, "0")
}

export async function GET() {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser?.email) {
      return NextResponse.json(
        { error: "Acces administrateur requis." },
        { status: 403 }
      )
    }

    const campaignId = getCampaignId()

    if (!campaignId) {
      return NextResponse.json(
        { error: "Identifiant campagne manquant." },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()

    const { data: books, error: booksError } = await supabase
      .from("receipt_books")
      .select(
        [
          "id",
          "book_number",
          "receipt_count",
          "start_receipt_number",
          "end_receipt_number",
          "responsible_name",
          "status",
          "notes",
          "created_at",
        ].join(", ")
      )
      .eq("campaign_id", campaignId)
      .order("book_number", { ascending: true })

    if (booksError) {
      return NextResponse.json(
        { error: `Impossible de charger les carnets : ${booksError.message}` },
        { status: 500 }
      )
    }

    const { data: receipts, error: receiptsError } = await supabase
      .from("receipt_registry")
      .select(
        [
          "id",
          "receipt_book_id",
          "receipt_number",
          "receipt_number_display",
          "status",
          "foana_reason",
          "foana_at",
          "foana_by",
          "used_at",
          "updated_at",
        ].join(", ")
      )
      .eq("campaign_id", campaignId)
      .order("receipt_number", { ascending: true })

    if (receiptsError) {
      return NextResponse.json(
        { error: `Impossible de charger les recus : ${receiptsError.message}` },
        { status: 500 }
      )
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("faith_envelope_payments")
      .select("id, receipt_registry_id, amount, status, paid_at, operator_name")
      .eq("campaign_id", campaignId)
      .order("paid_at", { ascending: false })

    if (paymentsError) {
      return NextResponse.json(
        {
          error: `Impossible de charger les paiements : ${paymentsError.message}`,
        },
        { status: 500 }
      )
    }

    const bookRows = (books ?? []) as unknown as ReceiptBookRow[]
    const receiptRows = (receipts ?? []) as unknown as ReceiptRow[]
    const paymentRows = (payments ?? []) as unknown as PaymentRow[]

    const receiptsByBookId = new Map<string, ReceiptRow[]>()
    const paymentsByReceiptId = new Map<string, PaymentRow>()

    receiptRows.forEach((receipt) => {
      if (!receipt.receipt_book_id) return

      const current = receiptsByBookId.get(receipt.receipt_book_id) ?? []
      current.push(receipt)
      receiptsByBookId.set(receipt.receipt_book_id, current)
    })

    paymentRows.forEach((payment) => {
      if (!payment.receipt_registry_id) return

      paymentsByReceiptId.set(payment.receipt_registry_id, payment)
    })

    const bookViews = bookRows.map((book) => {
      const bookReceipts = receiptsByBookId.get(book.id) ?? []
      const receiptsByNumber = new Map<number, ReceiptRow>()

      bookReceipts.forEach((receipt) => {
        receiptsByNumber.set(receipt.receipt_number, receipt)
      })

      const receiptViews = []

      for (
        let number = book.start_receipt_number;
        number <= book.end_receipt_number;
        number += 1
      ) {
        const receipt = receiptsByNumber.get(number)
        const payment = receipt ? paymentsByReceiptId.get(receipt.id) : null

        receiptViews.push({
          id: receipt?.id ?? null,
          receipt_number: number,
          receipt_number_display:
            receipt?.receipt_number_display ?? formatReceiptNumber(number),
          status: receipt?.status ?? "available",
          registry_created: Boolean(receipt),
          foana_reason: receipt?.foana_reason ?? null,
          foana_at: receipt?.foana_at ?? null,
          foana_by: receipt?.foana_by ?? null,
          used_at: receipt?.used_at ?? null,
          payment_amount: payment?.amount ?? null,
          payment_status: payment?.status ?? null,
          payment_operator: payment?.operator_name ?? null,
          payment_paid_at: payment?.paid_at ?? null,
        })
      }

      const usedCount = receiptViews.filter(
        (receipt) => receipt.status === "used"
      ).length
      const foanaCount = receiptViews.filter(
        (receipt) => receipt.status === "foana"
      ).length
      const voidedCount = receiptViews.filter(
        (receipt) => receipt.status === "voided"
      ).length
      const availableCount = receiptViews.filter(
        (receipt) => receipt.status === "available"
      ).length

      return {
        ...book,
        used_count: usedCount,
        foana_count: foanaCount,
        voided_count: voidedCount,
        available_count: availableCount,
        receipts: receiptViews,
      }
    })

    const totals = bookViews.reduce(
      (acc, book) => {
        acc.books += 1
        acc.receipts += book.receipt_count
        acc.used += book.used_count
        acc.foana += book.foana_count
        acc.voided += book.voided_count
        acc.available += book.available_count
        return acc
      },
      {
        books: 0,
        receipts: 0,
        used: 0,
        foana: 0,
        voided: 0,
        available: 0,
      }
    )

    return NextResponse.json({
      books: bookViews,
      totals,
    })
  } catch (error) {
    console.error("Erreur chargement carnets recus :", error)

    return NextResponse.json(
      { error: "Erreur interne lors du chargement des carnets et recus." },
      { status: 500 }
    )
  }
}
