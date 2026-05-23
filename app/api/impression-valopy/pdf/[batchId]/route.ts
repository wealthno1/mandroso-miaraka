import { readFile } from "node:fs/promises"
import path from "node:path"
import { createElement } from "react"
import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"

import { getAuthenticatedAdmin } from "@/lib/auth/admin-access"
import { createAdminClient } from "@/lib/supabase/admin"
import ValopyFinoanaDocument from "@/lib/pdf/ValopyFinoanaDocument"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    batchId: string
  }>
}

type BatchItem = {
  numbered_envelope_id: string
}

type NumberedEnvelope = {
  id: string
  envelope_number: number
  display_number: string
}

function pairNumbers(numbers: string[]) {
  const pages: Array<{
    topNumber: string
    bottomNumber: string
  }> = []

  for (let index = 0; index < numbers.length; index += 2) {
    const topNumber = numbers[index]
    const bottomNumber = numbers[index + 1]

    if (!bottomNumber) {
      throw new Error("Le nombre de flyers doit être pair.")
    }

    pages.push({
      topNumber,
      bottomNumber,
    })
  }

  return pages
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const adminUser = await getAuthenticatedAdmin()

    if (!adminUser) {
      return NextResponse.json(
        { error: "Accès administrateur requis." },
        { status: 403 }
      )
    }

    const { batchId } = await params

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (!uuidPattern.test(batchId)) {
      return NextResponse.json(
        { error: "Identifiant de lot invalide." },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: batch, error: batchError } = await supabase
      .from("envelope_print_batches")
      .select("id, batch_name, flyer_count, page_count")
      .eq("id", batchId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: "Lot d’impression introuvable." },
        { status: 404 }
      )
    }

    const { data: items, error: itemsError } = await supabase
      .from("envelope_print_batch_items")
      .select("numbered_envelope_id")
      .eq("batch_id", batchId)

    if (itemsError || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Aucun numéro trouvé pour ce lot." },
        { status: 404 }
      )
    }

    const envelopeIds = (items as BatchItem[]).map(
      (item) => item.numbered_envelope_id
    )

    const { data: envelopes, error: envelopesError } = await supabase
      .from("numbered_envelopes")
      .select("id, envelope_number, display_number")
      .in("id", envelopeIds)
      .order("envelope_number", { ascending: true })

    if (envelopesError || !envelopes || envelopes.length === 0) {
      return NextResponse.json(
        { error: "Impossible de charger les numéros du lot." },
        { status: 500 }
      )
    }

    const numbers = (envelopes as NumberedEnvelope[]).map(
      (envelope) => envelope.display_number
    )

    if (numbers.length !== batch.flyer_count) {
      return NextResponse.json(
        {
          error:
            "Le nombre de numéros trouvés ne correspond pas au lot enregistré.",
        },
        { status: 500 }
      )
    }

    if (numbers.length % 2 !== 0) {
      return NextResponse.json(
        { error: "Le lot doit contenir un nombre pair de flyers." },
        { status: 500 }
      )
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "valopy-finoana-master-a4.png"
    )

    const templateBuffer = await readFile(templatePath)

const pages = pairNumbers(numbers)

const pdfDocument = createElement(ValopyFinoanaDocument, {
  pages,
  templateData: templateBuffer,
})

    const pdfBuffer = await renderToBuffer(pdfDocument)

    const firstNumber = numbers[0]
    const lastNumber = numbers[numbers.length - 1]
    const filename = `valopy_finoana_${firstNumber}_${lastNumber}.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Erreur génération PDF Valopy :", error)

    return NextResponse.json(
      { error: "Erreur interne lors de la génération du PDF." },
      { status: 500 }
    )
  }
}