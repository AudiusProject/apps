import {
  userMetadataFromSDK,
  userTrackMetadataFromSDK
} from '@audius/common/adapters'
import { FullTracksResponseFromJSON } from '@audius/sdk/src/sdk/api/generated/full/models/FullTracksResponse'
import type { PageContextServer } from 'vike/types'

import { env } from 'services/env'

export async function onBeforeRender(pageContext: PageContextServer) {
  const { handle, slug } = pageContext.routeParams

  try {
    // Fetching directly from API rather than using the sdk because
    // including the sdk increases bundle size and creates substantial cold start times
    const requestPath = `v1/full/tracks?permalink=${handle}/${slug}`
    const requestUrl = `${env.API_URL}/${requestPath}`

    const res = await fetch(requestUrl)
    if (res.status !== 200) {
      throw new Error(requestUrl)
    }

    const { data } = FullTracksResponseFromJSON(await res.json())
    if (!data || data.length === 0) {
      throw new Error(
        `Parsed SDK response returned no tracks for ${requestUrl}`
      )
    }
    const [apiTrack] = data
    // Include artwork in the track object
    const track = {
      ...userTrackMetadataFromSDK(apiTrack),
      cover_art: apiTrack.artwork?._1000x1000
    }

    const { user: apiUser } = apiTrack
    // Include api user images.
    const user = {
      ...userMetadataFromSDK(apiUser),
      cover_photo: apiUser.coverPhoto?._2000x,
      profile_picture: apiUser.profilePicture?._1000x1000
    }

    return {
      pageContext: {
        pageProps: { track, user }
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
