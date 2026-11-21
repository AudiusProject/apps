import { env } from 'services/env'
import { isElectron } from 'utils/clientUtil'

const ENV = env.ENVIRONMENT

if (!isElectron() && ENV === 'production') {
  // const appUrl = window.location.href
  //   .replace('http://', '')
  //   .replace('https://', '')
  //   .replace(window.location.host, `${SCHEME}:/`)
  // window.location = appUrl
}
