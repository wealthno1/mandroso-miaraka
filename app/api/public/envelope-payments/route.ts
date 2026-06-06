import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EnvelopePaymentRow = {
  id: string
  amount: number | string
  paid_at: string | null
  faith_envelopes:
    | {
        beneficiary_name: string | null
        is_anonymous: boolean | null
      }
    | {
        beneficiary_name: string | null
        is_anonymous: boolean | null
      }[]
    | null
}

function getCampaignId() {
  return process.env.IRAY_VOLANA_CAMPAIGN_ID
}

function getEnvelopeName(row: EnvelopePaymentRow) {
  const envelope = Array.isArray(row.faith_envelopes)
    ? row.faith_envelopes[0]
    : row.faith_envelopes

  if (!envelope || envelope.is_anonymous) {
    return "TSY MITONONA ANARANA"
  }

  return envelope.beneficiary_name || "TSY MITONONA ANARANA"
}

export async function GET() {
  try {
    const campaignId = getCampaignId()

    if (!campaignId) {
      return NextResponse.json(
        { error: "IRAY_VOLANA_CAMPAIGN_ID n'est pas configure." },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("faith_envelope_payments")
      .select(
        [
          "id",
          "amount",
          "paid_at",
          "faith_envelopes!inner(beneficiary_name, is_anonymous)",
        ].join(", ")
      )
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .order("paid_at", { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json(
        { error: `Impossible de charger les valopy farany : ${error.message}` },
        { status: 500 }
      )
    }

    const gifts = ((data ?? []) as unknown as EnvelopePaymentRow[]).map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      contributor_name: getEnvelopeName(row),
      paid_at: row.paid_at,
    }))

    return NextResponse.json({ gifts })
  } catch (error) {
    console.error("Erreur API valopy farany :", error)

    return NextResponse.json(
      { error: "Erreur interne lors du chargement des valopy farany." },
      { status: 500 }
    )
  }
}
