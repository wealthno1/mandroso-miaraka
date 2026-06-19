import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type Envelope = {
  id: string
  envelope_number: string
  beneficiary_name: string | null
  status: string | null
  total_paid: number | string | null
  final_category: string | null
  is_anonymous: boolean | null
}

type CategoryStat = {
  key: string
  label: string
  count: number
  closed: number
  inProgress: number
  amount: number
}

const CATEGORY_ROWS = [
  { key: "VALOPY VY", label: "Fer / Valopy Vy" },
  { key: "VARAHINA", label: "Cuivre / Varahina" },
  { key: "BRONZE", label: "Bronze" },
  { key: "VOLAFOTSY", label: "Argent / Volafotsy" },
  { key: "VOLAMENA", label: "Or / Volamena" },
  { key: "PLATININA", label: "Platine / Platinina" },
  { key: "DIAMONDRA", label: "Diamant / Diamondra" },
  { key: "NON_CATEGORISEE", label: "Non cat\u00e9goris\u00e9e" },
]

function formatAmount(amount: number) {
  return amount.toLocaleString("fr-FR") + " Ar"
}

function normalizeCategory(value: string | null | undefined) {
  const category = value?.trim().toUpperCase()

  if (!category) return "NON_CATEGORISEE"
  if (category.includes("VY") || category.includes("FER")) return "VALOPY VY"
  if (category.includes("VARAHINA") || category.includes("CUIVRE")) return "VARAHINA"
  if (category.includes("BRONZE")) return "BRONZE"
  if (category.includes("VOLAFOTSY") || category.includes("ARGENT")) return "VOLAFOTSY"
  if (category.includes("VOLAMENA") || category.includes("OR")) return "VOLAMENA"
  if (category.includes("PLATININA") || category.includes("PLATINE")) return "PLATININA"
  if (category.includes("DIAMONDRA") || category.includes("DIAMANT")) return "DIAMONDRA"

  return "NON_CATEGORISEE"
}

function buildCategoryStats(envelopes: Envelope[]) {
  const map = new Map<string, CategoryStat>()

  for (const row of CATEGORY_ROWS) {
    map.set(row.key, {
      key: row.key,
      label: row.label,
      count: 0,
      closed: 0,
      inProgress: 0,
      amount: 0,
    })
  }

  for (const envelope of envelopes) {
    if (envelope.status === "cancelled") continue

    const key = normalizeCategory(envelope.final_category)
    const current = map.get(key) || map.get("NON_CATEGORISEE")

    if (!current) continue

    const amount = Number(envelope.total_paid || 0)

    current.count += 1
    current.amount += Number.isFinite(amount) ? amount : 0

    if (envelope.status === "closed") {
      current.closed += 1
    }

    if (envelope.status === "in_progress") {
      current.inProgress += 1
    }
  }

  return CATEGORY_ROWS.map((row) => map.get(row.key)).filter(Boolean) as CategoryStat[]
}

export default async function VisuelsPage() {
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
      <main className="p-10">
        <h1 className="text-4xl font-bold">Visuels exportables</h1>
        <p className="mt-4 text-red-700">Aucune campagne trouv\u00e9e.</p>
      </main>
    )
  }

  const { data: envelopesData, error: envelopesError } = await supabase
    .from("faith_envelopes")
    .select("id, envelope_number, beneficiary_name, status, total_paid, final_category, is_anonymous")
    .eq("campaign_id", campaign.id)
    .order("envelope_number", { ascending: true })
    .limit(2000)

  const envelopes = Array.isArray(envelopesData) ? (envelopesData as Envelope[]) : []
  const stats = buildCategoryStats(envelopes)

  const targetAmount = Number(campaign.target_amount || 0)
  const currentAmount = Number(campaign.current_amount || 0)
  const remainingAmount = Math.max(targetAmount - currentAmount, 0)
  const percent = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
  const progressWidth = Math.min(percent, 100).toFixed(2) + "%"
  const today = new Date().toLocaleString("fr-FR")

  const totalEnvelopes = stats.reduce((sum, row) => sum + row.count, 0)
  const totalClosed = stats.reduce((sum, row) => sum + row.closed, 0)

  const announcementText = [
    "Tatitra fohy momba ny ezaka Volana iray ho an'ny Tompo.",
    "",
    "Tanjona : " + formatAmount(targetAmount),
    "Vola voaangona hatreto : " + formatAmount(currentAmount),
    "Fivoarana : " + percent.toFixed(2) + " %",
    "Sisa andrasana : " + formatAmount(remainingAmount),
    "",
    "Vokatry ny valopy araka ny sokajy :",
    ...stats
      .filter((row) => row.amount > 0 || row.count > 0)
      .map((row) => "- " + row.label + " : " + row.count + " valopy � " + formatAmount(row.amount)),
    "",
    remainingAmount > 0
      ? "Mbola misy " + formatAmount(remainingAmount) + " sisa hahatratrarana ny tanjona. Raha tarihin'ny Tompo isika dia afaka mbola mandray anjara amin-kalalahana sy amin'ny fo madio."
      : "Isaorana Andriamanitra fa tratra ny tanjona napetraka.",
    "",
    "Ho an'Andriamanitra irery ihany anie ny voninahitra.",
  ].join("\\n")

  return (
    <main className="space-y-8 p-10">
      <div>
        <h1 className="text-4xl font-bold">Visuels exportables</h1>
        <p className="mt-3 text-gray-600">
          Cr\u00e9ation rapide de visuels, textes d'annonce et synth\u00e8ses pour projection ou partage.
        </p>
        <p className="mt-1 text-sm text-gray-500">Derni\u00e8re actualisation : {today}</p>
      </div>

      {envelopesError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
          Erreur enveloppes : {envelopesError.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Objectif</p>
          <p className="mt-2 text-2xl font-bold">{formatAmount(targetAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Collect\u00e9</p>
          <p className="mt-2 text-2xl font-bold text-green-700">{formatAmount(currentAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Reste</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatAmount(remainingAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-600">Progression</p>
          <p className="mt-2 text-2xl font-bold">{percent.toFixed(2)} %</p>
        </div>
      </section>

      <section className="rounded-3xl bg-slate-900 p-8 text-white shadow">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-300">Mandroso Miaraka</p>
          <h2 className="mt-3 text-4xl font-black">Volana iray ho an'ny Tompo</h2>
          <p className="mt-2 text-lg text-slate-200">Tanjona : {formatAmount(targetAmount)}</p>

          <div className="mt-8 rounded-2xl bg-white/10 p-8">
            <p className="text-sm text-slate-300">Vola voaangona</p>
            <p className="mt-2 text-5xl font-black text-emerald-300">{formatAmount(currentAmount)}</p>
          </div>

          <div className="mt-6 h-8 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: progressWidth }}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-sm text-slate-300">Fivoarana</p>
              <p className="text-3xl font-bold">{percent.toFixed(2)} %</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-sm text-slate-300">Fanomezana sisa andrasana</p>
              <p className="text-3xl font-bold text-red-200">{formatAmount(remainingAmount)}</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-300">
            Valopy suivies : {totalEnvelopes} � Valopy cl\u00f4tur\u00e9es : {totalClosed}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">Texte d'annonce pr\u00eat \u00e0 copier</h2>
          <p className="mt-2 text-sm text-gray-600">
            Utiliser ce texte pour annonce, WhatsApp ou pr\u00e9sentation orale.
          </p>

          <textarea
            readOnly
            value={announcementText}
            className="mt-4 h-96 w-full rounded-xl border p-4 font-mono text-sm"
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">R\u00e9sum\u00e9 par cat\u00e9gorie</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ordre officiel : Fer, Cuivre, Bronze, Argent, Or, Platine, Diamant.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Cat\u00e9gorie</th>
                  <th className="p-3 text-right">Valopy</th>
                  <th className="p-3 text-right">Cl\u00f4tur\u00e9es</th>
                  <th className="p-3 text-right">Montant</th>
                </tr>
              </thead>

              <tbody>
                {stats.map((row) => (
                  <tr key={row.key} className="border-b">
                    <td className="p-3 font-bold">{row.label}</td>
                    <td className="p-3 text-right">{row.count}</td>
                    <td className="p-3 text-right">{row.closed}</td>
                    <td className="p-3 text-right font-bold text-green-700">
                      {formatAmount(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
        <h2 className="text-xl font-bold">Conseil d'utilisation</h2>
        <p className="mt-2">
          Pour projeter le visuel, ouvrir cette page en plein \u00e9cran. Pour imprimer ou exporter,
          utiliser Ctrl + P, ou faire une capture d'\u00e9cran du bloc bleu.
        </p>
      </section>
    </main>
  )
}
