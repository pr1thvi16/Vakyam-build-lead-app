'use server'

import { z } from 'zod'
import { createPrivilegedClient } from '@/lib/supabase/server'
import { scoreLead } from '@/lib/scoring'

const leadSchema = z.object({
  intent: z.enum(['buyer', 'offplan', 'tenant', 'landlord']),
  budget_aed: z.coerce.number().int().min(0).max(1_000_000_000),
  timeline: z.enum(['immediate', '1-3m', '3-6m', '6m+']),
  area: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+971\s?5\d{8}$/),
  notes: z.string().trim().max(2000).optional().default(''),
  lang: z.enum(['en', 'ar']),
})

export async function submitLead(raw: unknown) {
  const parsed = leadSchema.safeParse(raw)
  if (!parsed.success) return { ok: false as const, error: 'Please check your answers and try again.' }

  const result = scoreLead(parsed.data)
  const responseTime = result.band === 'hot' ? 'within 1 hour' : result.band === 'warm' ? 'same day' : 'within 2 days'
  const supabase = createPrivilegedClient()
  const { error } = await supabase.from('leads').insert({
    ...parsed.data,
    notes: parsed.data.notes || null,
    score: result.score,
    band: result.band,
    reasons: result.reasons,
    ai_summary: null,
    next_action: responseTime,
  })
  if (error) return { ok: false as const, error: 'We could not save your request. Please try again.' }
  return { ok: true as const, band: result.band, responseTime }
}

export async function updateLeadStatus(id: string, status: 'new' | 'contacted' | 'viewing' | 'closed') {
  const supabase = await import('@/lib/supabase/server').then(({ createClient }) => createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const }
  const { error } = await supabase.from('leads').update({ status }).eq('id', id)
  return { ok: !error }
}
