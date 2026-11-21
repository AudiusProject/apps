import { Share } from 'react-native'

import { env } from 'app/services/env'

type ShareProps = {
  message?: string
  url: string
}

const share = async ({ message, url }: ShareProps) => {
  const fullUrl = `${env.AUDIUS_URL}${url}`

  try {
    const context = { message: message ? `${message} ${fullUrl}` : fullUrl }
    await Share.share(context)
  } catch (error) {
    console.error(error)
  }
}

export default share
