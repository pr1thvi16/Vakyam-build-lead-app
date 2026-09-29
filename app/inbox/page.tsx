import { createClient } from '@/lib/supabase/server'
import { InboxTable } from '@/components/crm/inbox-table'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: leads } = user ? await supabase.from('leads').select('id,created_at,intent,budget_aed,timeline,area,name,phone,notes,lang,score,band,ai_summary,next_action,status').order('created_at', { ascending: false }) : { data: [] }
  return <InboxTable leads={leads ?? []} signedIn={!!user} />
}
