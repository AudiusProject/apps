import type { VercelRequest, VercelResponse } from '@vercel/node'

import { rowToResponse } from '../_lib/serialize'
import { getSupabase, TABLE } from '../_lib/supabase'
import type { DbRow } from '../_lib/types'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = String(req.query.id ?? '').trim()
  if (!id) {
    res.status(400).json({ error: 'id is required.' })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle<DbRow>()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  if (!data) {
    res.status(404).json({ error: 'Request not found.' })
    return
  }

  res.status(200).json(rowToResponse(data))
}
