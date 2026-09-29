import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InboxTable, sortLeads } from '@/components/crm/inbox-table'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: leads } = await supabase.from('leads').select('id,created_at,intent,budget_aed,timeline,area,name,phone,notes,lang,score,band,reasons,ai_summary,next_action,status').order('score', { ascending: false }).order('created_at', { ascending: false })
  return <InboxTable leads={sortLeads(leads ?? [])} />
}
