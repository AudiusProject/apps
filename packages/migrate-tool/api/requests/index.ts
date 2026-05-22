import type { VercelRequest, VercelResponse } from '@vercel/node'

import { getSupabase, TABLE } from '../_lib/supabase'
import type { TrackPreview } from '../_lib/types'

type Body = {
  newUserId?: string
  newUserHandle?: string
  oldHandle?: string
  tracks?: TrackPreview[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = (req.body ?? {}) as Body
  const newUserId = String(body.newUserId ?? '').trim()
  const newUserHandle = String(body.newUserHandle ?? '').trim()
  const oldHandle = String(body.oldHandle ?? '').trim().replace(/^@/, '')
  const tracks = Array.isArray(body.tracks) ? body.tracks : []

  if (!newUserId || !newUserHandle || !oldHandle || tracks.length === 0) {
    res.status(400).json({
      error: 'newUserId, newUserHandle, oldHandle, and tracks are required.'
    })
    return
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      new_user_id: newUserId,
      new_user_handle: newUserHandle,
      old_handle: oldHandle,
      tracks,
      status: 'pending'
    })
    .select('id')
    .single()

  if (error || !data) {
    res.status(500).json({ error: error?.message ?? 'Insert failed.' })
    return
  }

  res.status(201).json({ id: data.id })
}
