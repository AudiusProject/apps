export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rejected'

export type TrackPreview = {
  trackId: string
  title: string
  genre?: string | null
  durationSec?: number | null
  artworkUrl?: string | null
  isDownloadable: boolean
  hasOriginal: boolean
}

export type TrackResult = {
  oldTrackId: string
  newTrackId?: string
  status: 'pending' | 'success' | 'failed'
  error?: string
}

export type DbRow = {
  id: string
  new_user_id: string
  new_user_handle: string
  old_handle: string
  status: RequestStatus
  tracks: TrackPreview[]
  results: TrackResult[] | null
  rejection_reason: string | null
  failure_reason: string | null
  created_at: string
  approved_at: string | null
  completed_at: string | null
}
