import { NextResponse } from "next/server"
import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"

type CreateBatchRequest = {
  startNumber?: number
  flyerCount?: number
  batchName?: string
  notes?: string
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

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc(
      "create_numbered_envelope_batch",
      {
        p_campaign_id: campaignId,
        p_start_number: startNumber,
        p_flyer_count: flyerCount,
        p_batch_name: body.batchName?.trim() || null,
        p_notes: body.notes?.trim() || null,
      }
    )

    if (error) {
      const conflict = error.message.includes("existent déjà")

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

    return NextResponse.json(
      {
        success: true,
        message: "Lot d’impression créé avec succès.",
        batch,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur create-batch :", error)

    return NextResponse.json(
      { error: "Erreur interne lors de la création du lot." },
      { status: 500 }
    )
  }
}