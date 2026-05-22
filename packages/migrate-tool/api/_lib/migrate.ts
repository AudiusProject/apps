import type { Genre, Mood } from '@audius/sdk'

import { getServerSDK } from './audius'
import { getSupabase, TABLE } from './supabase'
import type { DbRow, TrackResult } from './types'

/**
 * Fetch a URL into a Blob with a reasonable timeout. Used for pulling the
 * old track's audio and artwork before re-uploading them to the new owner.
 */
async function fetchBlob(url: string, timeoutMs = 90_000): Promise<Blob> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Fetch ${res.status} ${res.statusText} (${url})`)
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
  return new File([blob], name, { type: blob.type || 'application/octet-stream' })
}

/**
 * Run the migration for one DB row. Updates the row in-place with per-track
 * results as it goes, and sets the final status when done.
 *
 * Limitation: only tracks flagged as downloadable expose the original
 * audio file. Other tracks fall back to the transcoded mp3 stream, which
 * is a lossy re-encoding rather than a bit-for-bit copy.
 */
export async function executeMigration(row: DbRow): Promise<void> {
  const supabase = getSupabase()
  const sdk = getServerSDK()

  await supabase
    .from(TABLE)
    .update({ status: 'running' })
    .eq('id', row.id)

  const results: TrackResult[] = row.tracks.map((t) => ({
    oldTrackId: t.trackId,
    status: 'pending'
  }))

  const persistResults = async () => {
    await supabase
      .from(TABLE)
      .update({ results })
      .eq('id', row.id)
  }

  let anyFailed = false

  for (let i = 0; i < row.tracks.length; i++) {
    const preview = row.tracks[i]!
    try {
      const trackRes = await sdk.tracks.getTrack({ trackId: preview.trackId })
      const track = trackRes.data
      if (!track) throw new Error('Track not found on source account.')

      const audioUrl = preview.isDownloadable
        ? await sdk.tracks.getTrackDownloadUrl({ trackId: preview.trackId })
        : await sdk.tracks.getTrackStreamUrl({ trackId: preview.trackId })

      const audioBlob = await fetchBlob(audioUrl)
      const audioFile = blobToFile(
        audioBlob,
        filenameFromUrl(audioUrl, `${preview.trackId}.mp3`)
      )

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
        // The generated type requires trackCid here, but the wrapped
        // createTrack populates it from the audio upload response. See
        // TracksApi.createTrack → populateTrackMetadataWithUploadResponseV2.
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
