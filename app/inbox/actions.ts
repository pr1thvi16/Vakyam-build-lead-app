'use server'

import { z } from 'zod'
import { createPrivilegedClient } from '@/lib/supabase/server'

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

function scoreLead(input: z.infer<typeof leadSchema>) {
  let score = 20
  if (input.intent === 'buyer' || input.intent === 'offplan') score += 15
  if (input.intent === 'landlord') score += 10
  if (input.budget_aed >= 2_000_000) score += 20
  else if (input.budget_aed >= 750_000) score += 12
  else if (input.budget_aed >= 250_000) score += 6
  if (input.timeline === 'immediate') score += 35
  else if (input.timeline === '1-3m') score += 25
  else if (input.timeline === '3-6m') score += 12
  if (/not ready|لست مستعد|غير مستعد/i.test(input.notes ?? '')) score -= 25

  const bounded = Math.max(0, Math.min(100, score))
  const band = bounded >= 75 ? 'hot' : bounded >= 50 ? 'warm' : 'cold'
  const responseTime = band === 'hot' ? 'within 1 hour' : band === 'warm' ? 'same day' : 'within 2 days'
  return { score: bounded, band, responseTime }
}

export async function submitLead(raw: unknown) {
  const parsed = leadSchema.safeParse(raw)
  if (!parsed.success) return { ok: false as const, error: 'Please check your answers and try again.' }

  const result = scoreLead(parsed.data)
  const supabase = createPrivilegedClient()
  const { error } = await supabase.from('leads').insert({
    ...parsed.data,
    notes: parsed.data.notes || null,
    score: result.score,
    band: result.band,
    reasons: { source: 'qualification-form' },
    ai_summary: null,
    next_action: result.responseTime,
  })
  if (error) return { ok: false as const, error: 'We could not save your request. Please try again.' }
  return { ok: true as const, band: result.band, responseTime: result.responseTime }
}

export async function updateLeadStatus(id: string, status: 'new' | 'contacted' | 'viewing' | 'closed') {
  const supabase = await import('@/lib/supabase/server').then(({ createClient }) => createClient())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const }
  const { error } = await supabase.from('leads').update({ status }).eq('id', id)
  return { ok: !error }
}
