import { createClient } from "@/lib/supabase/server"
import PublicLiveView from "./PublicLiveView"
import ModeBanner from "@/app/ModeBanner"

export const revalidate = 0

export default async function PublicPage() {
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .single()

  if (!campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Aucune campagne publique trouvée.</p>
      </main>
    )
  }

  return (
    <>
      <ModeBanner />
      <PublicLiveView initialCampaign={campaign} />
    </>
  )
}