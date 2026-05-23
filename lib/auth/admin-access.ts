import "server-only"

import { createClient } from "@/lib/supabase/server"

export async function getAuthenticatedAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return null
  }

  const adminEmails = (process.env.APP_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  const userEmail = user.email.toLowerCase()

  if (!adminEmails.includes(userEmail)) {
    return null
  }

  return user
}