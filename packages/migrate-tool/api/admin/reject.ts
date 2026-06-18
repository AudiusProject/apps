import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireAdmin } from '../_lib/auth'
import { getSupabase, TABLE } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!(await requireAdmin(req, res))) return

  const id = String(req.query.id ?? '').trim()
  if (!id) {
    res.status(400).json({ error: 'id is required.' })
    return
  }

  const body = (req.body ?? {}) as { reason?: string }
  const reason = String(body.reason ?? '').trim() || null

  const supabase = getSupabase()
  const { error } = await supabase
    .from(TABLE)
    .update({
      status: 'rejected',
      rejection_reason: reason
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({ ok: true })
}
