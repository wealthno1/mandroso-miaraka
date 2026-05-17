import { createClient } from "@/lib/supabase/server"

export default async function TestSupabasePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen p-10">
      <h1 className="mb-6 text-3xl font-bold">
        Test Supabase Auth
      </h1>

      <pre className="rounded-xl bg-gray-100 p-4 text-sm overflow-auto">
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  )
}