import { execSync } from 'child_process'
import dns from 'dns/promises'
import url from 'url'

function getProxy(): string | undefined {
  if (process.env.https_proxy) {
    return process.env.https_proxy
  }

  try {
    const httpsProxy = execSync('npm config get https-proxy').toString().trim()
    return httpsProxy !== 'null' ? httpsProxy : undefined
  } catch (e) {
    return
  }
}

export async function getOnline(): Promise<boolean> {
  try {
    await dns.lookup('registry.yarnpkg.com')
    return true
  } catch {
    const proxy = getProxy()
    if (!proxy) {
      return false
    }

    const { hostname } = url.parse(proxy)
    if (!hostname) {
      return false
    }

    try {
      await dns.lookup(hostname)
      return true
    } catch {
      return false
    }
  }
}
