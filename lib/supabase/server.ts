import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components cannot always write cookies.
          }
        },
      },
    },
  )
}

export function createPrivilegedClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing server Supabase key')

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: { getAll: () => [], setAll: () => undefined },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
