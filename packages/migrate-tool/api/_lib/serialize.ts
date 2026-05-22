import type { DbRow } from './types'

export function rowToResponse(row: DbRow) {
  return {
    id: row.id,
    newUserId: row.new_user_id,
    newUserHandle: row.new_user_handle,
    oldHandle: row.old_handle,
    status: row.status,
    tracks: row.tracks,
    results: row.results ?? [],
    rejectionReason: row.rejection_reason,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    completedAt: row.completed_at
  }
}
