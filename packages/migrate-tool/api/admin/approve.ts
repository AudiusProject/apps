import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireAdmin } from '../_lib/auth'
import { executeMigration } from '../_lib/migrate'
import { getSupabase, TABLE } from '../_lib/supabase'
import type { DbRow } from '../_lib/types'

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

  const supabase = getSupabase()

  // Conditionally flip pending → approved so a double-approval is a no-op.
  const { data: claimed, error: claimError } = await supabase
    .from(TABLE)
    .update({
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle<DbRow>()

  if (claimError) {
    res.status(500).json({ error: claimError.message })
    return
  }
  if (!claimed) {
    res.status(409).json({ error: 'Request is not pending.' })
    return
  }

  try {
    await executeMigration(claimed)
  } catch (e) {
    await supabase
      .from(TABLE)
      .update({
        status: 'failed',
        failure_reason: e instanceof Error ? e.message : String(e),
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
    res.status(500).json({
      error: 'Migration failed.',
      message: e instanceof Error ? e.message : String(e)
    })
    return
  }

  res.status(200).json({ ok: true })
}
