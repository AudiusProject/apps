import type { User } from '../models'

export const getXShareHandle = (user: User) => {
  const xHandle = user.twitter_handle
  return xHandle ? `@${xHandle}` : user.name
}

export const makeXShareUrl = (url: string | null, text: string) => {
  const textString = `?text=${encodeURIComponent(text)}`
  const urlString = url ? `&url=${encodeURIComponent(url)}` : ''

  return `http://x.com/intent/tweet${textString}${urlString}`
}
