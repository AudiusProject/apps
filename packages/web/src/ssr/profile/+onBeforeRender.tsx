import { userMetadataFromSDK } from '@audius/common/adapters'
import { FullUserResponseFromJSON } from '@audius/sdk/src/sdk/api/generated/full/models/FullUserResponse'
import type { PageContextServer } from 'vike/types'

import { env } from 'services/env'

export async function onBeforeRender(pageContext: PageContextServer) {
  const { handle } = pageContext.routeParams

  try {
    // Fetching directly from API rather than using the sdk because
    // including the sdk increases bundle size and creates substantial cold start times
    const requestPath = `v1/full/users/handle/${handle}`
    const requestUrl = `${env.API_URL}/${requestPath}`

    const res = await fetch(requestUrl)
    if (res.status !== 200) {
      throw new Error(requestUrl)
    }

    const { data } = FullUserResponseFromJSON(await res.json())
    if (!data || data.length === 0) {
      throw new Error(`Parsed SDK response returned no users for ${requestUrl}`)
    }
    const apiUser = data[0]

    // Include api user images.
    const user = {
      ...userMetadataFromSDK(apiUser),
      cover_photo: apiUser.coverPhoto?._2000x,
      profile_picture: apiUser.profilePicture?._1000x1000
    }

    return {
      pageContext: {
        pageProps: { user }
      }
    }
  } catch (e) {
    console.error(
      'Error fetching user for profile page SSR',
      'handle',
      handle,
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
