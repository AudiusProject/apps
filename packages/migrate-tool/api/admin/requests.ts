import type { VercelRequest, VercelResponse } from '@vercel/node'

import { requireAdmin } from '../_lib/auth'
import { rowToResponse } from '../_lib/serialize'
import { getSupabase, TABLE } from '../_lib/supabase'
import type { DbRow } from '../_lib/types'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!(await requireAdmin(req, res))) return

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(200).json({
    requests: ((data ?? []) as DbRow[]).map(rowToResponse)
  })
}
