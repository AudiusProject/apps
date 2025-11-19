export const externalLinkAllowList = new Set([
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'blog.audius.co',
  'link.audius.co',
  'yak.audius.co',
  'audius.co',
  'discord.gg',
  'solscan.io',
  'help.audius.co',
  'support.audius.co'
])

export const isAllowedExternalLink = (link: string) => {
  try {
    // Add protocol if missing to allow URL parsing
    const urlWithProtocol =
      link.startsWith('http://') || link.startsWith('https://')
        ? link
        : `https://${link}`
    let hostname = new URL(urlWithProtocol).hostname
    hostname = hostname.replace(/^www\./, '')
    return externalLinkAllowList.has(hostname)
  } catch (e) {
    return false
  }
}

export const makeSolanaTransactionLink = (signature: string) => {
  return `https://solscan.io/tx/${signature}`
}

export const makeSolanaAccountLink = (account: string) => {
  return `https://solscan.io/account/${account}`
}
