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

export type MigrationRequest = {
  id: string
  newUserId: string
  newUserHandle: string
  oldHandle: string
  status: RequestStatus
  tracks: TrackPreview[]
  results?: TrackResult[]
  createdAt: string
  approvedAt?: string | null
  completedAt?: string | null
  rejectionReason?: string | null
  failureReason?: string | null
}
