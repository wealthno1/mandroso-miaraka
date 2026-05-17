"use client"

import { useEffect, useState } from "react"
import { createClient } from "../../../lib/supabase/client"

export default function ContributionsPage() {
  const supabase = createClient()

  const [campaignId, setCampaignId] = useState("")
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("Espèces")
  const [notes, setNotes] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function loadCampaign() {
      const { data } = await supabase
        .from("campaigns")
        .select("id")
        .limit(1)
        .single()

      if (data) {
        setCampaignId(data.id)
      }
    }

    loadCampaign()
  }, [supabase])

  async function handleSubmit(e: any) {
    e.preventDefault()

    const amountNumber = Number(amount)

    if (!campaignId || amountNumber <= 0) {
      setMessage("Montant invalide ou campagne introuvable.")
      return
    }

    const { error } = await supabase.from("contributions").insert({
      campaign_id: campaignId,
      contributor_name: name,
      amount: amountNumber,
      payment_method: paymentMethod,
      notes,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setName("")
    setAmount("")
    setPaymentMethod("Espèces")
    setNotes("")
    setMessage("Contribution ajoutée avec succès.")
  }

  return (
    <div>
      <h1 className="mb-6 text-4xl font-bold">
        Contributions
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl rounded-2xl bg-white p-6 shadow"
      >
        <input
          className="mb-4 w-full rounded-xl border p-3"
          placeholder="Nom du contributeur"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded-xl border p-3"
          placeholder="Montant en Ariary"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select
          className="mb-4 w-full rounded-xl border p-3"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option>Espèces</option>
          <option>MVola</option>
          <option>Orange Money</option>
          <option>Virement</option>
          <option>Chèque</option>
        </select>

        <textarea
          className="mb-4 w-full rounded-xl border p-3"
          placeholder="Commentaire"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button className="rounded-xl bg-blue-600 px-6 py-3 text-white">
          Ajouter la contribution
        </button>

        <p className="mt-4 text-sm">{message}</p>
      </form>
    </div>
  )
}