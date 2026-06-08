import type { PageContextServer } from 'vike/types'

// Simple helper to get API URL without importing services/env which pulls in SDK dependencies
const getApiUrl = () => {
  const env = process.env.VITE_ENVIRONMENT || 'development'
  switch (env) {
    case 'production':
      return 'https://api.audius.co'
    case 'development':
    default:
      return process.env.VITE_API_URL || 'http://audius-api'
  }
}

type TrackPageContextServer = PageContextServer & {
  urlParsed: {
    search: Record<string, string>
  }
}

// Fetch comment data if commentId is provided
async function fetchCommentData(commentId: string) {
  try {
    const url = `${getApiUrl()}/v1/comments/${commentId}`
    const res = await fetch(url)
    if (res.status !== 200) {
      return null
    }
    const { data, related } = await res.json()
    const comment = Array.isArray(data) ? data[0] : data

    if (!comment) return null

    const track = related.tracks.find(
      (t: { id: string }) => t.id === comment.entity_id
    )
    const commenter = related.users.find(
      (u: { id: string }) => u.id === comment.user_id
    )

    return { comment, track, commenter }
  } catch {
    return null
  }
}

// Fetch parent track permalink when this track is a remix (for SEO: link remix → original)
async function fetchOriginalTrackPermalink(
  parentTrackId: string
): Promise<string | null> {
  try {
    const url = `${getApiUrl()}/v1/tracks/${parentTrackId}`
    const res = await fetch(url)
    if (res.status !== 200) return null
    const json = await res.json()
    const parent = Array.isArray(json.data) ? json.data[0] : json.data
    return parent?.permalink ?? null
  } catch {
    return null
  }
}

export async function onBeforeRender(pageContext: TrackPageContextServer) {
  const { handle, slug } = pageContext.routeParams
  const { commentId } = pageContext.urlParsed.search ?? {}

  try {
    const requestPath = `v1/tracks?permalink=${handle}/${slug}`
    const requestUrl = `${getApiUrl()}/${requestPath}`

    const res = await fetch(requestUrl)
    if (res.status !== 200) {
      throw new Error(requestUrl)
    }

    const json = await res.json()
    if (!json.data || json.data.length === 0) {
      throw new Error(`No track found for permalink: ${handle}/${slug}`)
    }
    const apiTrack = json.data[0]

    const { user, ...track } = apiTrack

    // Fetch comment data if commentId is provided
    let commentData = null
    if (commentId) {
      commentData = await fetchCommentData(commentId)
      // Verify the comment is for this track
      if (commentData && commentData.track?.id !== track.id) {
        console.info('Comment track does not match URL track, ignoring comment')
        commentData = null
      }
    }

    // When this track is a remix, fetch original track permalink for SEO (isBasedOn, etc.)
    let originalTrackPermalink: string | null = null
    const remixOf = apiTrack.remix_of ?? apiTrack.remixOf
    const parentId =
      remixOf?.tracks?.[0]?.parent_track_id ??
      remixOf?.tracks?.[0]?.parentTrackId
    if (parentId != null) {
      originalTrackPermalink = await fetchOriginalTrackPermalink(
        String(parentId)
      )
    }

    return {
      pageContext: {
        pageProps: {
          track,
          user,
          commentData,
          originalTrackPermalink
        }
      }
    }
  } catch (e) {
    console.error(
      'Error fetching track for track page SSR',
      'handle',
      handle,
      'slug',
      slug,
      'error',
      e
    )
    return {
      pageContext: {
        pageProps: {}
      }
    }
  }
}
