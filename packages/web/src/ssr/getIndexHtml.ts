import { env } from 'services/env'

import indexHtml from '../../index.html?raw'

const pattern = /%(\S+?)%/g

export const getIndexHtml = () => {
  return (
    indexHtml
      // Replace all %*% with the corresponding environment variable
      .replace(pattern, (text: string, key) => {
        if (key in env) {
          return String(env[key as keyof typeof env] ?? text)
        }
        console.warn(`Missing environment variable: ${key}`)
        return text
      })
      // Remove unsupported polyfills that are not needed for SSR
      .replace(/<script id="polyfills".*<\/script>/m, '')
      // Remove index script because it will be added by the server
      .replace(/<script id="index".*<\/script>/m, '')
  )
}
