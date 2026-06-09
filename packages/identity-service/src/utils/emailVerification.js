const crypto = require('crypto')
const config = require('../config')
const { getEmailVerificationEmail } = require('../emails/emailVerification')

const TOKEN_BYTES = 32
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

const generateVerificationToken = () => {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const buildVerificationLink = (token) => {
  const host = config.get('identityServiceHost')
  return `${host}/email/verify?token=${encodeURIComponent(token)}`
}

const sendVerificationEmail = async ({ email, token, sendgrid, logger }) => {
  if (!sendgrid) {
    if (logger)
      logger.warn('Sendgrid not configured; skipping verification email')
    return false
  }
  const verificationLink = buildVerificationLink(token)
  const copyrightYear = new Date().getFullYear().toString()
  const html = getEmailVerificationEmail({ verificationLink, copyrightYear })

  await sendgrid.send({
    from: 'The Audius Team <team@audius.co>',
    to: email,
    subject: 'Verify your Audius email address',
    html
  })
  return true
}

module.exports = {
  TOKEN_TTL_MS,
  generateVerificationToken,
  hashToken,
  buildVerificationLink,
  sendVerificationEmail
}
