import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const appMode = process.env.NEXT_PUBLIC_APP_MODE || "production"

  if (appMode !== "formation") {
    return NextResponse.json(
      { ok: false, error: "Formation health check disabled outside formation mode." },
      { status: 404 }
    )
  }

  const campaignId = process.env.IRAY_VOLANA_CAMPAIGN_ID || null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  let supabaseHost = null

  try {
    supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null
  } catch {
    supabaseHost = "URL invalide"
  }

  if (!campaignId) {
    return NextResponse.json({
      ok: false,
      step: "campaign_id_missing",
      appMode,
      campaignId,
      supabaseHost,
      serviceRoleConfigured,
    })
  }

  try {
    const supabase = createAdminClient()

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, title, target_amount, current_amount, end_date, created_at")
      .eq("id", campaignId)
      .maybeSingle()

    const { data: recentCampaigns, error: recentError } = await supabase
      .from("campaigns")
      .select("id, title, current_amount, created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    return NextResponse.json({
      ok: !campaignError && Boolean(campaign),
      appMode,
      campaignId,
      supabaseHost,
      serviceRoleConfigured,
      campaignFound: Boolean(campaign),
      campaign,
      campaignError: campaignError
        ? {
            message: campaignError.message,
            code: campaignError.code,
            details: campaignError.details,
            hint: campaignError.hint,
          }
        : null,
      recentCampaigns: recentCampaigns || [],
      recentError: recentError
        ? {
            message: recentError.message,
            code: recentError.code,
            details: recentError.details,
            hint: recentError.hint,
          }
        : null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue"

    return NextResponse.json({
      ok: false,
      step: "server_exception",
      appMode,
      campaignId,
      supabaseHost,
      serviceRoleConfigured,
      error: message,
    })
  }
}
