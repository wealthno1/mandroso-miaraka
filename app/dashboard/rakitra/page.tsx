"use client"

import { useEffect, useState } from "react"
import { createClient } from "../../../lib/supabase/client"

type Rakitra = {
  id: string
  sunday_date: string
  amount: number
  comment: string | null
}

export default function RakitraPage() {
  const supabase = createClient()

  const [campaignId, setCampaignId] = useState("")
  const [sundayDate, setSundayDate] = useState("")
  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")
  const [rakitraList, setRakitraList] = useState<Rakitra[]>([])
  const [message, setMessage] = useState("")

  async function loadData() {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .limit(1)
      .single()

    if (campaign) {
      setCampaignId(campaign.id)

      const { data } = await supabase
        .from("rakitra")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("sunday_date", { ascending: false })

      if (data) {
        setRakitraList(data as Rakitra[])
      }
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()

    const amountNumber = Number(amount)

    if (!campaignId || !sundayDate || amountNumber <= 0) {
      setMessage("Date ou montant invalide.")
      return
    }

    const { error } = await supabase.from("rakitra").insert({
      campaign_id: campaignId,
      sunday_date: sundayDate,
      amount: amountNumber,
      comment,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setSundayDate("")
    setAmount("")
    setComment("")
    setMessage("Rakitra faha-4 ajouté avec succès.")
    loadData()
  }

  const totalRakitra = rakitraList.reduce(
    (total, item) => total + Number(item.amount),
    0
  )

  return (
    <div>
      <h1 className="mb-6 text-4xl font-bold">
        Rakitra faha-4
      </h1>

      <div className="mb-6 rounded-2xl bg-white p-6 shadow">
        <p className="text-lg text-gray-600">
          Total Rakitra faha-4
        </p>

        <p className="text-4xl font-bold text-green-600">
          {totalRakitra.toLocaleString()} Ar
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-8 max-w-xl rounded-2xl bg-white p-6 shadow"
      >
        <input
          type="date"
          className="mb-4 w-full rounded-xl border p-3"
          value={sundayDate}
          onChange={(e) => setSundayDate(e.target.value)}
        />

        <input
          type="number"
          className="mb-4 w-full rounded-xl border p-3"
          placeholder="Montant Rakitra en Ariary"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <textarea
          className="mb-4 w-full rounded-xl border p-3"
          placeholder="Commentaire"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button className="rounded-xl bg-blue-600 px-6 py-3 text-white">
          Ajouter Rakitra
        </button>

        <p className="mt-4 text-sm">{message}</p>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">
          Historique Rakitra
        </h2>

        <div className="space-y-3">
          {rakitraList.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-gray-100 p-4"
            >
              <div>
                <p className="font-bold">
                  {new Date(item.sunday_date).toLocaleDateString("fr-FR")}
                </p>

                <p className="text-sm text-gray-600">
                  {item.comment || "Aucun commentaire"}
                </p>
              </div>

              <p className="text-xl font-bold text-green-600">
                {Number(item.amount).toLocaleString()} Ar
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}