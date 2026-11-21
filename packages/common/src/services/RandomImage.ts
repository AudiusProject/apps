import { Nullable } from '~/utils/typeUtils'

const UNSPLASH_PUBLIC = 'https://source.unsplash.com/random'
const UNSPLASH_API_GATEWAY = 'https://api.audius.co/unsplash/photos/random'

const UNSPLASH_PUBLIC_TIMEOUT = 8000
const UNSPLASH_API_GATEWAY_TIMEOUT = 2000

type Timeout = { timeout: boolean }

function isResponse(x: Response | Timeout): x is Response {
  return !(x as Timeout).timeout
}

const getRandomInt = () => {
  return Math.floor(Math.random() * 50000)
}

export class RandomImage {
  static get = async (query?: string) => {
    const timer = (timeout: number): Promise<Timeout> =>
      new Promise((resolve) => {
        setTimeout(resolve, timeout, {
          timeout: true
        })
      })

    let res: Nullable<Response | Timeout> = null
    try {
      res = await Promise.race([
        fetch(
          `${UNSPLASH_API_GATEWAY}?${
            query ? `query=${query}&` : ''
          }sig=${getRandomInt()}`
        ),
        timer(UNSPLASH_API_GATEWAY_TIMEOUT)
      ])
    } catch (e) {
      // no-op.
    }

    if (res && isResponse(res) && res.ok) {
      const imagePayload = await res.clone().json()
      try {
        const image = await fetch(imagePayload.urls.regular)
        if (image) return image.blob()
      } catch (e) {
        // continue onto public gateway
      }
    }

    try {
      res = await Promise.race([
        fetch(
          `${UNSPLASH_PUBLIC}?sig=${getRandomInt()}${query ? `/&${query}` : ''}`
        ),
        timer(UNSPLASH_PUBLIC_TIMEOUT)
      ])
      if (res && isResponse(res)) {
        return res.blob()
      }
    } catch (e) {
      console.error(e)
      // continue on
    }
    return false
  }
}
