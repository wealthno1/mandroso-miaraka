"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import confetti from "canvas-confetti"

type Contribution = {
  contributor_name: string | null
  amount: number | string
}

export default function LiveDonationPopup() {
  const supabase = createClient()

  const [visible, setVisible] = useState(false)
  const [contribution, setContribution] =
    useState<Contribution | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel("live-contributions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contributions",
        },
        (payload) => {
          const newContribution = payload.new as Contribution
          const amount = Number(newContribution.amount)
          setContribution(newContribution)
          setVisible(true)
if (amount >= 100000) {
  confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
  })
}
          const audio = new Audio(
  amount >= 100000
    ? "/sounds/big-donation.mp3?v=2"
: "/sounds/donation.mp3?v=2"
)
          audio.volume = 0.5
          audio.play().catch(() => {})

          setTimeout(() => {
            setVisible(false)
          }, 6000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (!visible || !contribution) return null

  const amount = Number(contribution.amount)
  const isBigDonation = amount >= 100000

  return (
    <div
      className={
        isBigDonation
          ? "fixed right-8 top-8 z-50 animate-bounce rounded-3xl border-4 border-yellow-300 bg-yellow-400 p-8 text-blue-950 shadow-2xl"
          : "fixed right-8 top-8 z-50 animate-bounce rounded-3xl border border-green-300 bg-green-500 p-6 text-white shadow-2xl"
      }
    >
      <p className="text-lg font-bold">
        {isBigDonation
          ? "🏆 Fanomezana lehibe !"
          : "🎉 Fanomezana vaovao !"}
      </p>

      <p className="mt-2 text-5xl font-extrabold">
        + {amount.toLocaleString()} Ar
      </p>

      <p className="mt-2 text-xl font-bold">
        {contribution.contributor_name || "Mpanome tsy fantatra"}
      </p>
    </div>
  )
}