import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type UpdateContributionRequest = {
  contributorName?: string
  amount?: number
  paymentMethod?: string
  notes?: string
  contributionDate?: string
  reason?: string
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser?.email) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      )
    }

    const { id } = await context.params
    const body = (await request.json()) as UpdateContributionRequest

    const amount = Number(body.amount)
    const reason = body.reason?.trim() || ""

    if (!id) {
      return NextResponse.json(
        { error: "Identifiant de contribution manquant." },
        { status: 400 }
      )
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être strictement supérieur à zéro." },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Le motif de modification est obligatoire." },
        { status: 400 }
      )
    }

    const contributionDate = body.contributionDate
      ? new Date(body.contributionDate)
      : null

    if (contributionDate && Number.isNaN(contributionDate.getTime())) {
      return NextResponse.json(
        { error: "La date de contribution est invalide." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc(
      "admin_update_contribution",
      {
        p_contribution_id: id,
        p_contributor_name: body.contributorName?.trim() || null,
        p_amount: amount,
        p_payment_method: body.paymentMethod?.trim() || null,
        p_notes: body.notes?.trim() || null,
        p_contribution_date: contributionDate
          ? contributionDate.toISOString()
          : null,
        p_reason: reason,
        p_changed_by: adminUser.email,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: `Impossible de modifier la contribution : ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Contribution modifiée avec succès.",
      contribution: data,
    })
  } catch (error) {
    console.error("Erreur modification contribution :", error)

    return NextResponse.json(
      { error: "Erreur interne lors de la modification de la contribution." },
      { status: 500 }
    )
  }
}