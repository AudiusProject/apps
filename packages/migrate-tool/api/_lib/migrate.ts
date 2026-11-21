import type { AudiusSdkWithServices, Genre, Mood, Track } from '@audius/sdk'

import { getServerSDK } from './audius'
import { getSupabase, TABLE } from './supabase'
import type { DbRow, TrackResult } from './types'

async function fetchBlob(url: string, timeoutMs = 90_000): Promise<Blob> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok)
      throw new Error(`Fetch ${res.status} ${res.statusText} (${url})`)
    return await res.blob()
  } finally {
    clearTimeout(timer)
  }
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').filter(Boolean).pop()
    return last || fallback
  } catch {
    return fallback
  }
}

function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, {
    type: blob.type || 'application/octet-stream'
  })
}

type AudioCandidate = {
  label: string
  resolve: () => Promise<{ url: string; filename: string }>
}

function buildAudioCandidates(
  sdk: AudiusSdkWithServices,
  track: Track,
  trackId: string,
  isDownloadablePreview: boolean
): AudioCandidate[] {
  const candidates: AudioCandidate[] = []

  if (track.origFileCid && track.isOriginalAvailable !== false) {
    const cid = track.origFileCid
    candidates.push({
      label: `orig-cid:${cid}`,
      resolve: async () => {
        const nodes = sdk.services.storageNodeSelector.getNodes(cid)
        if (nodes.length === 0) {
          throw new Error('No storage node available for original file CID.')
        }
        return {
          url: `${nodes[0]}/content/${cid}`,
          filename: track.origFilename ?? cid
        }
      }
    })

    candidates.push({
      label: `orig-cid-mirrors:${cid}`,
      resolve: async () => {
        const nodes = sdk.services.storageNodeSelector.getNodes(cid)
        const mirror = nodes[1] ?? nodes[2]
        if (!mirror) {
          throw new Error('No mirror available for original file CID.')
        }
        return {
          url: `${mirror}/content/${cid}`,
          filename: track.origFilename ?? cid
        }
      }
    })
  }

  if (isDownloadablePreview) {
    candidates.push({
      label: 'download-url',
      resolve: async () => {
        const url = await sdk.tracks.getTrackDownloadUrl({ trackId })
        return { url, filename: filenameFromUrl(url, `${trackId}.audio`) }
      }
    })
  }

  candidates.push({
    label: 'stream-url',
    resolve: async () => {
      const url = await sdk.tracks.getTrackStreamUrl({ trackId })
      return { url, filename: filenameFromUrl(url, `${trackId}.mp3`) }
    }
  })

  return candidates
}

async function fetchAudio(
  candidates: AudioCandidate[]
): Promise<{ blob: Blob; filename: string; source: string }> {
  const errors: string[] = []
  for (const candidate of candidates) {
    try {
      const { url, filename } = await candidate.resolve()
      const blob = await fetchBlob(url)
      return { blob, filename, source: candidate.label }
    } catch (e) {
      errors.push(
        `${candidate.label}: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }
  throw new Error(`No audio source succeeded. Tried: ${errors.join(' | ')}`)
}

export async function executeMigration(row: DbRow): Promise<void> {
  const supabase = getSupabase()
  const sdk = getServerSDK()

  await supabase.from(TABLE).update({ status: 'running' }).eq('id', row.id)

  const results: TrackResult[] = row.tracks.map((t) => ({
    oldTrackId: t.trackId,
    status: 'pending'
  }))

  const persistResults = async () => {
    await supabase.from(TABLE).update({ results }).eq('id', row.id)
  }

  let anyFailed = false

  for (let i = 0; i < row.tracks.length; i++) {
    const preview = row.tracks[i]!
    try {
      const trackRes = await sdk.tracks.getTrack({ trackId: preview.trackId })
      const track = trackRes.data
      if (!track) throw new Error('Track not found on source account.')

      const candidates = buildAudioCandidates(
        sdk,
        track,
        preview.trackId,
        preview.isDownloadable
      )
      const { blob: audioBlob, filename: audioFilename } =
        await fetchAudio(candidates)
      const audioFile = blobToFile(audioBlob, audioFilename)

      let imageFile: File | undefined
      const artworkUrl =
        track.artwork?._1000x1000 ??
        track.artwork?._480x480 ??
        track.artwork?._150x150
      if (artworkUrl) {
        const imageBlob = await fetchBlob(artworkUrl)
        imageFile = blobToFile(
          imageBlob,
          filenameFromUrl(artworkUrl, 'artwork.jpg')
        )
      }

      const upload = await sdk.tracks.createTrack({
        userId: row.new_user_id,
        audioFile,
        imageFile,
        // @ts-expect-error trackCid is set by the SDK after audio upload
        metadata: {
          title: track.title,
          genre: track.genre as Genre,
          description: track.description ?? undefined,
          mood: (track.mood as Mood | undefined) ?? undefined,
          tags: track.tags ?? undefined,
          isrc: track.isrc ?? undefined,
          iswc: track.iswc ?? undefined,
          license: track.license ?? undefined
        }
      })

      results[i] = {
        oldTrackId: preview.trackId,
        newTrackId: upload.trackId,
        status: 'success'
      }
    } catch (e) {
      anyFailed = true
      results[i] = {
        oldTrackId: preview.trackId,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e)
      }
    }
    await persistResults()
  }

  await supabase
    .from(TABLE)
    .update({
      status: anyFailed ? 'failed' : 'completed',
      results,
      completed_at: new Date().toISOString(),
      failure_reason: anyFailed
        ? 'One or more tracks failed to migrate. See per-track results.'
        : null
    })
    .eq('id', row.id)
}
