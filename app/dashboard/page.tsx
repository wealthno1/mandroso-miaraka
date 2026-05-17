import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .single()

  if (!campaign) {
    return (
      <main className="p-10">
        <h1>Aucune campagne trouvée</h1>
      </main>
    )
  }

  const percent =
    (campaign.current_amount / campaign.target_amount) * 100

  const remaining =
    campaign.target_amount - campaign.current_amount

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-8">
        Dashboard Mandroso Miaraka
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">
            Objectif
          </h2>

          <p className="text-3xl font-bold">
            {campaign.target_amount.toLocaleString()} Ar
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">
            Collecté
          </h2>

          <p className="text-3xl font-bold text-green-600">
            {campaign.current_amount.toLocaleString()} Ar
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">
            Reste
          </h2>

          <p className="text-3xl font-bold text-red-600">
            {remaining.toLocaleString()} Ar
          </p>
        </div>
      </div>

      <div className="mt-10 bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4">
          Progression
        </h2>

        <div className="w-full bg-gray-200 rounded-full h-6">
          <div
            className="bg-blue-600 h-6 rounded-full"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>

        <p className="mt-4 text-lg font-semibold">
          {percent.toFixed(2)} %
        </p>
      </div>
    </main>
  )
}