import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CancelContributionRequest = {
  reason?: string
}

export async function POST(
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
    const body = (await request.json()) as CancelContributionRequest
    const reason = body.reason?.trim() || ""

    if (!id) {
      return NextResponse.json(
        { error: "Identifiant de contribution manquant." },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Le motif d’annulation est obligatoire." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc(
      "admin_cancel_contribution",
      {
        p_contribution_id: id,
        p_reason: reason,
        p_cancelled_by: adminUser.email,
      }
    )

    if (error) {
      return NextResponse.json(
        { error: `Impossible d’annuler la contribution : ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Contribution annulée avec succès.",
      contribution: data,
    })
  } catch (error) {
    console.error("Erreur annulation contribution :", error)

    return NextResponse.json(
      { error: "Erreur interne lors de l’annulation de la contribution." },
      { status: 500 }
    )
  }
}