"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Contribution = {
  id: string
  contributor_name: string | null
  amount: number
  envelope_category: string | null
  operator_name: string | null
  contribution_date: string
}

export default function EnveloppesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [operateur, setOperateur] = useState("")
  const [nom, setNom] = useState("")
  const [montant, setMontant] = useState("")
  const [anonyme, setAnonyme] = useState(false)
  const [loading, setLoading] = useState(false)
  const [historique, setHistorique] = useState<Contribution[]>([])
  const [campaignId, setCampaignId] = useState("")

  async function chargerCampaign() {
    const { data } = await supabase
      .from("campaigns")
      .select("id")
      .limit(1)
      .single()

    if (data) {
      setCampaignId(data.id)
      return data.id
    }

    return ""
  }

  async function chargerHistorique() {
    const { data } = await supabase
      .from("contributions")
      .select("*")
      .eq("contribution_type", "iray_volana")
      .order("contribution_date", { ascending: false })
      .limit(10)

    if (data) {
      setHistorique(data as Contribution[])
    }
  }

  useEffect(() => {
    const savedOperator = localStorage.getItem("mandroso_operator")

    if (savedOperator) {
      setOperateur(savedOperator)
    }

    chargerCampaign()
    chargerHistorique()

    const channel = supabase
      .channel("enveloppes-dashboard-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contributions",
        },
        (payload) => {
          const newContribution = payload.new as {
            contribution_type?: string
          }

          if (newContribution.contribution_type === "iray_volana") {
            chargerHistorique()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function ajouterEnveloppe() {
    if (loading) return

    const amountNumber = Number(montant)

    if (!montant || amountNumber <= 0) {
      alert("Veuillez saisir un montant valide.")
      return
    }

    let activeCampaignId = campaignId

    if (!activeCampaignId) {
      activeCampaignId = await chargerCampaign()
    }

    if (!activeCampaignId) {
      alert("Aucune campagne active trouvée.")
      return
    }

    setLoading(true)

    const { error } = await supabase.from("contributions").insert({
      campaign_id: activeCampaignId,
      operator_name: operateur || "Poste non précisé",
      contributor_name: nom || "TSY MITONONA ANARANA",
      amount: amountNumber,
      contribution_type: "iray_volana",
      event_name: "Iray Volana ho an'ny Tompo",
      is_anonymous: anonyme,
    })

    if (error) {
      setLoading(false)
      alert("Erreur insertion")
      console.log(error)
      return
    }

    alert("Enveloppe ajoutée")
    await chargerHistorique()

    setNom("")
    setMontant("")
    setAnonyme(false)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="mb-6 text-4xl font-bold">
        Enveloppes Iray Volana
      </h1>

      <div className="max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow">
        <input
          type="text"
          placeholder="Opérateur / Poste ex: Poste 1"
          value={operateur}
          onChange={(e) => {
            setOperateur(e.target.value)
            localStorage.setItem("mandroso_operator", e.target.value)
          }}
          className="w-full rounded-lg border p-4"
        />

        <input
          type="text"
          placeholder="Nom ou groupe"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded-lg border p-4"
        />

        <input
          type="number"
          placeholder="Montant"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="w-full rounded-lg border p-4"
        />

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={anonyme}
            onChange={(e) => setAnonyme(e.target.checked)}
          />

          <span>Tsy mitonona anarana</span>
        </label>

        <button
          onClick={ajouterEnveloppe}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? "Enregistrement..." : "Ajouter enveloppe"}
        </button>
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">
          Dernières enveloppes saisies
        </h2>

        <div className="space-y-3">
          {historique.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-gray-100 p-4"
            >
              <div>
                <p className="font-bold">
                  {item.contributor_name || "Tsy fantatra"}
                </p>

                <p className="text-sm text-gray-600">
                  {item.operator_name || "Poste non précisé"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-green-600">
                  {Number(item.amount).toLocaleString()} Ar
                </p>

                <p className="text-sm text-gray-600">
                  {item.envelope_category || "Catégorie non définie"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}