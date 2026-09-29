'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const { error } = await createClient().auth.signInWithPassword({ email, password })
      if (error) setError('Invalid email or password.')
      else window.location.assign('/inbox')
    })
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7"><p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Nest Dubai</p><h1 className="mt-2 text-3xl font-semibold">Agent sign in</h1><p className="mt-2 text-slate-400">Access your qualified lead inbox.</p><label className="mt-7 block text-sm text-slate-300">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 outline-none focus:border-emerald-400" /></label><label className="mt-4 block text-sm text-slate-300">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 outline-none focus:border-emerald-400" /></label>{error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}<button disabled={pending} className="mt-6 min-h-11 w-full rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950 disabled:opacity-60">{pending ? 'Signing in…' : 'Sign in'}</button></form></main>
}
