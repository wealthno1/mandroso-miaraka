"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function EnveloppesPage() {
  const [nom, setNom] = useState("")
  const [montant, setMontant] = useState("")
  const [anonyme, setAnonyme] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function ajouterEnveloppe() {
    if (loading) return

    const amountNumber = Number(montant)

    if (!montant || amountNumber <= 0) {
      alert("Veuillez saisir un montant valide.")
      return
    }

    setLoading(true)

    const { error } = await supabase.from("contributions").insert({
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
    </div>
  )
}