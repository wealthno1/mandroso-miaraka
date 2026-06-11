import { createAdminClient } from "@/lib/supabase/admin"
import PublicLiveView from "./PublicLiveView"

export const revalidate = 0

export default async function PublicPage() {
  const supabase = createAdminClient()

  const campaignId = process.env.IRAY_VOLANA_CAMPAIGN_ID

  const campaignQuery = supabase.from("campaigns").select("*")

  const { data: campaign } = campaignId
    ? await campaignQuery.eq("id", campaignId).maybeSingle()
    : await campaignQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

  if (!campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Aucune campagne publique trouvée.</p>
      </main>
    )
  }

  return <PublicLiveView initialCampaign={campaign} />
}