import { NextResponse } from "next/server"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type CreateBatchRequest = {
  startNumber?: number
  flyerCount?: number
}

function formatNumber(value: number) {
  return value.toString().padStart(4, "0")
}

function isNumberConflict(message: string) {
  const normalizedMessage = message
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

  return (
    normalizedMessage.includes("existe deja") ||
    normalizedMessage.includes("existent deja") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("unique")
  )
}

export async function POST(request: Request) {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      )
    }

    const campaignId = process.env.IRAY_VOLANA_CAMPAIGN_ID

    if (!campaignId) {
      return NextResponse.json(
        { error: "L’identifiant de la campagne n’est pas configuré." },
        { status: 500 }
      )
    }

    const body = (await request.json()) as CreateBatchRequest

    const startNumber = Number(body.startNumber)
    const flyerCount = Number(body.flyerCount)

    if (!Number.isInteger(startNumber) || startNumber <= 0) {
      return NextResponse.json(
        { error: "Le premier numéro doit être un nombre entier positif." },
        { status: 400 }
      )
    }

    if (
      !Number.isInteger(flyerCount) ||
      flyerCount <= 0 ||
      flyerCount % 2 !== 0
    ) {
      return NextResponse.json(
        {
          error:
            "Le nombre de flyers doit être un nombre pair supérieur à zéro.",
        },
        { status: 400 }
      )
    }

    if (flyerCount > 1000) {
      return NextResponse.json(
        {
          error:
            "Pour des raisons de sécurité, un lot ne peut pas dépasser 1000 flyers.",
        },
        { status: 400 }
      )
    }

    const endNumber = startNumber + flyerCount - 1

    /*
      En mode production réelle, le serveur génère lui-même les libellés.
      Les textes envoyés par le navigateur ne peuvent donc pas transformer
      accidentellement un lot réel en lot de test.
    */
    const batchName = `PRODUCTION - Lot N° ${formatNumber(startNumber)} à N° ${formatNumber(endNumber)}`
    const notes = "LOT REEL - IMPRESSION PRODUCTION VALOPY FINOANA"

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc(
      "create_numbered_envelope_batch",
      {
        p_campaign_id: campaignId,
        p_start_number: startNumber,
        p_flyer_count: flyerCount,
        p_batch_name: batchName,
        p_notes: notes,
      }
    )

    if (error) {
      const conflict = isNumberConflict(error.message)

      return NextResponse.json(
        {
          error: conflict
            ? "Un ou plusieurs numéros existent déjà dans cette plage."
            : `Impossible de créer le lot : ${error.message}`,
        },
        { status: conflict ? 409 : 400 }
      )
    }

    const batch = Array.isArray(data) ? data[0] : data

    if (!batch) {
      return NextResponse.json(
        { error: "Le lot n’a pas été retourné après sa création." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lot réel d’impression créé avec succès.",
        batch,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur create-batch :", error)

    return NextResponse.json(
      { error: "Erreur interne lors de la création du lot réel." },
      { status: 500 }
    )
  }
}