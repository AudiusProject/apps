import { OS } from '@audius/common/models'

const APP_DOWNLOAD_URL = 'https://download.audius.co'

/** Given the OS, fetch the latest download version from s3. */
export const getDownloadLinkForSystem = async (os: OS) => {
  let yaml: any
  try {
    yaml = await new Promise((resolve, reject) => {
      import('js-yaml')
        .then((yaml) => resolve(yaml))
        .catch((e) => {
          reject(e)
        })
    })
  } catch (e) {
    console.error(e)
    // Return an empty url to fetch, this will just lead to a no-op on the client's part
    return ''
  }

  let latest
  if (os === 'win') {
    latest = await fetch(`${APP_DOWNLOAD_URL}/latest.yml`)
  } else {
    latest = await fetch(`${APP_DOWNLOAD_URL}/latest-${os}.yml`)
  }
  const raw = await latest.text()
  let path = yaml.load(raw).path
  if (os === 'mac') {
    path = path.replace('-mac.zip', '.dmg')
  }
  return `${APP_DOWNLOAD_URL}/${path}`
}

export default class DownloadApp {
  static start = async (os: OS) => {
    const link = document.createElement('a')
    const downloadLink = await getDownloadLinkForSystem(os)
    link.setAttribute('href', downloadLink)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
