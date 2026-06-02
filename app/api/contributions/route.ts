import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CreateContributionRequest = {
  contributorName?: string
  amount?: number
  paymentMethod?: string
  notes?: string
  contributionDate?: string
}

type ContributionRow = {
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

function getCampaignId() {
  return process.env.IRAY_VOLANA_CAMPAIGN_ID
}

export async function GET(request: Request) {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      )
    }

    const campaignId = getCampaignId()

    if (!campaignId) {
      return NextResponse.json(
        { error: "L’identifiant de la campagne n’est pas configuré." },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const contributionType = searchParams.get("type") || "all"
    const search = searchParams.get("search")?.trim() || ""

    const supabase = createAdminClient()

    let query = supabase
      .from("contributions")
      .select(
        [
          "id",
          "campaign_id",
          "contributor_name",
          "display_name",
          "amount",
          "contribution_date",
          "payment_method",
          "notes",
          "comment",
          "event_type",
          "contribution_type",
          "event_name",
          "is_anonymous",
          "envelope_category",
          "operator_name",
          "status",
          "cancelled_at",
          "cancellation_reason",
          "cancelled_by",
          "updated_at",
          "updated_by",
          "last_update_reason",
        ].join(", ")
      )
      .eq("campaign_id", campaignId)
      .order("contribution_date", { ascending: false })

    if (status === "active" || status === "cancelled") {
      query = query.eq("status", status)
    }

    if (contributionType !== "all") {
      query = query.eq("contribution_type", contributionType)
    }

    if (search) {
      query = query.ilike("contributor_name", `%${search}%`)
    }
const { data, error } = await query.limit(500)

if (error) {
  return NextResponse.json(
    { error: `Impossible de charger les contributions : ${error.message}` },
    { status: 500 }
  )
}

const contributions = (data ?? []) as unknown as ContributionRow[]

const activeTotal = contributions
  .filter((item) => item.status === "active")
  .reduce((sum, item) => sum + Number(item.amount), 0)

const cancelledTotal = contributions
  .filter((item) => item.status === "cancelled")
  .reduce((sum, item) => sum + Number(item.amount), 0)

return NextResponse.json({
  contributions,
  summary: {
    displayedCount: contributions.length,
    activeTotal,
    cancelledTotal,
  },
})
    
  } catch (error) {
    console.error("Erreur chargement contributions :", error)

    return NextResponse.json(
      { error: "Erreur interne lors du chargement des contributions." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser?.email) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      )
    }

    const campaignId = getCampaignId()

    if (!campaignId) {
      return NextResponse.json(
        { error: "L’identifiant de la campagne n’est pas configuré." },
        { status: 500 }
      )
    }

    const body = (await request.json()) as CreateContributionRequest

    const contributorName = body.contributorName?.trim() || null
    const amount = Number(body.amount)
    const paymentMethod = body.paymentMethod?.trim() || null
    const notes = body.notes?.trim() || null

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être strictement supérieur à zéro." },
        { status: 400 }
      )
    }

    const contributionDate = body.contributionDate
      ? new Date(body.contributionDate)
      : new Date()

    if (Number.isNaN(contributionDate.getTime())) {
      return NextResponse.json(
        { error: "La date de contribution est invalide." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("contributions")
      .insert({
        campaign_id: campaignId,
        contributor_name: contributorName,
        amount,
        payment_method: paymentMethod,
        notes,
        contribution_date: contributionDate.toISOString(),
        contribution_type: "normal",
        event_type: "general",
        status: "active",
        updated_by: adminUser.email,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Impossible d’ajouter la contribution : ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Contribution ajoutée avec succès.",
        contribution: data,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur ajout contribution :", error)

    return NextResponse.json(
      { error: "Erreur interne lors de l’ajout de la contribution." },
      { status: 500 }
    )
  }
}