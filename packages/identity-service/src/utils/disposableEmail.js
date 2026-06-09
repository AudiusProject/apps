const fs = require('fs')
const path = require('path')

const BLOCKLIST_PATH = path.resolve(
  __dirname,
  '../data/disposable_email_blocklist.conf'
)

let disposableDomains = null

const loadBlocklist = () => {
  if (disposableDomains) return disposableDomains
  const contents = fs.readFileSync(BLOCKLIST_PATH, 'utf8')
  disposableDomains = new Set(
    contents
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
  )
  return disposableDomains
}

const getEmailDomain = (email) => {
  if (typeof email !== 'string') return null
  const at = email.lastIndexOf('@')
  if (at === -1 || at === email.length - 1) return null
  return email
    .slice(at + 1)
    .toLowerCase()
    .trim()
}

const isDisposableEmail = (email) => {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return loadBlocklist().has(domain)
}

module.exports = {
  isDisposableEmail,
  getEmailDomain
}
