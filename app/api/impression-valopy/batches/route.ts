import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      )
    }

    const campaignId = process.env.IRAY_VOLANA_CAMPAIGN_ID

    if (!campaignId) {
      return NextResponse.json(
        { error: "L’identifiant de la campagne n’est pas configuré." },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("envelope_print_batches")
      .select(
        "id, batch_name, start_number, end_number, flyer_count, page_count, batch_type, notes, created_at"
      )
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: `Impossible de charger les lots : ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      batches: data ?? [],
    })
  } catch (error) {
    console.error("Erreur récupération des lots Valopy :", error)

    return NextResponse.json(
      { error: "Erreur interne lors du chargement des lots." },
      { status: 500 }
    )
  }
}