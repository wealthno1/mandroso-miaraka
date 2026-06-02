"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import LiveDonationPopup from "./LiveDonationPopup"
import AnimatedAmount from "./AnimatedAmount"
import RotatingVerse from "./RotatingVerse"

type Campaign = {
  id: string
  title: string
  target_amount: number
  current_amount: number
  end_date: string
}

type Contribution = {
  id: string
  contributor_name: string | null
  amount: number
  status?: "active" | "cancelled" | null
}

type Rakitra = {
  id: string
  sunday_date: string
  amount: number
  comment: string | null
  created_at: string | null
}

export default function PublicLiveView({
  initialCampaign,
}: {
  initialCampaign: Campaign
}) {
  const supabase = createClient()

  const [campaign, setCampaign] = useState(initialCampaign)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [rakitraList, setRakitraList] = useState<Rakitra[]>([])

  useEffect(() => {
    async function loadContributions() {
      const { data } = await supabase
        .from("contributions")
        .select("id, contributor_name, amount, status")
        .eq("campaign_id", initialCampaign.id)
        .eq("status", "active")
        .order("contribution_date", { ascending: false })
        .limit(5)

      if (data) {
        setContributions(data as Contribution[])
      }
    }

    async function loadRakitra() {
      const { data } = await supabase
        .from("rakitra")
        .select("id, sunday_date, amount, comment, created_at")
        .eq("campaign_id", initialCampaign.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (data) {
        setRakitraList(data as Rakitra[])
      }
    }

    loadContributions()
    loadRakitra()

    const channel = supabase
      .channel("public-live-view")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${initialCampaign.id}`,
        },
        (payload) => {
          setCampaign(payload.new as Campaign)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contributions",
          filter: `campaign_id=eq.${initialCampaign.id}`,
        },
        (payload) => {
          const newContribution = payload.new as Contribution

          if (newContribution.status === "cancelled") {
            return
          }

          setContributions((previous) =>
            [newContribution, ...previous].slice(0, 5)
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contributions",
          filter: `campaign_id=eq.${initialCampaign.id}`,
        },
        (payload) => {
          const updatedContribution = payload.new as Contribution

          if (updatedContribution.status === "cancelled") {
            setContributions((previous) =>
              previous.filter((item) => item.id !== updatedContribution.id)
            )
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rakitra",
          filter: `campaign_id=eq.${initialCampaign.id}`,
        },
        (payload) => {
          const newRakitra = payload.new as Rakitra

          setRakitraList((previous) => [newRakitra, ...previous].slice(0, 5))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, initialCampaign.id])

  const percent =
    (Number(campaign.current_amount) / Number(campaign.target_amount)) * 100

  const remaining =
    Number(campaign.target_amount) - Number(campaign.current_amount)

  const today = new Date()
  const endDate = new Date(campaign.end_date)
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-blue-950 px-4 py-4 text-white">
      <LiveDonationPopup />

      <button
        onClick={() => document.documentElement.requestFullscreen()}
        className="fixed bottom-6 right-6 z-50 rounded-2xl bg-yellow-400 px-6 py-3 text-lg font-bold text-blue-950 shadow-2xl transition hover:scale-105"
      >
        Plein écran
      </button>

      <section className="w-full max-w-6xl text-center">
        <p className="mb-4 text-xl uppercase tracking-widest text-blue-200">
          MANDROSO MIARAKA
        </p>

        <h1 className="mb-4 text-6xl font-bold">{campaign.title}</h1>

        <p className="text-2xl text-blue-100">
          Tanjona : {Number(campaign.target_amount).toLocaleString()} Ar
        </p>

        <p className="mb-8 mt-6 text-3xl font-bold text-yellow-300">
          {daysRemaining} andro sisa
        </p>

        <div className="mb-8 rounded-3xl bg-white/10 p-10 shadow-2xl">
          <p className="mb-2 text-xl text-blue-100">Vola voangona</p>

          <p className="text-6xl font-extrabold text-green-300">
            <AnimatedAmount value={Number(campaign.current_amount)} />
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-full bg-white/20 p-2 shadow-inner">
          <div
            className="h-12 rounded-full bg-gradient-to-r from-green-400 to-emerald-300 transition-all duration-1000"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white/10 p-6">
            <p className="text-blue-100">Fivoarana</p>
            <p className="text-5xl font-bold">{percent.toFixed(2)} %</p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6">
            <p className="text-blue-100">Fanomezana sisa andrasana</p>

            <p className="text-5xl font-bold text-red-300">
              {remaining.toLocaleString()} Ar
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-4 text-3xl font-bold text-yellow-300">
            Fanomezana farany
          </h2>

          <div className="grid gap-3 md:grid-cols-5">
            <AnimatePresence>
              {contributions.map((contribution) => (
                <motion.div
                  key={contribution.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl bg-white/10 p-3 shadow-lg"
                >
                  <p className="text-xl font-bold text-green-300">
                    + {Number(contribution.amount).toLocaleString()} Ar
                  </p>

                  <p className="mt-1 text-sm text-blue-100">
                    {contribution.contributor_name || "Tsy fantatra"}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-4 text-3xl font-bold text-yellow-300">
            Rakitra farany
          </h2>

          <div className="grid gap-3 md:grid-cols-5">
            <AnimatePresence>
              {rakitraList.map((rakitra) => (
                <motion.div
                  key={rakitra.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl bg-white/10 p-3 shadow-lg"
                >
                  <p className="text-xl font-bold text-blue-200">
                    + {Number(rakitra.amount).toLocaleString()} Ar
                  </p>

                  <p className="mt-1 text-sm text-blue-100">
                    {rakitra.comment || "Rakitra"}
                  </p>

                  <p className="mt-1 text-xs text-blue-200">
                    {new Date(rakitra.sunday_date).toLocaleDateString("fr-FR")}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <QRCodeSVG
              value="https://mandroso-miaraka.vercel.app/donate"
              size={140}
            />
          </div>

          <p className="mt-4 text-lg text-blue-100">Scanéo eto ny QR Code</p>
        </div>

        <RotatingVerse />
      </section>
    </main>
  )
}