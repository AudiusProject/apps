const { getOtpEmail, getOtpEmailText } = require('../emails/otp')
const { DISABLE_TRACKING } = require('./transactionalEmail')

const OTP_CHARS = '0123456789'
const OTP_REDIS_PREFIX = 'otp'
const OTP_EXPIRATION_SECONDS = 600
const OTP_COUNT_REDIS_POSTFIX = 'count'
const OTP_COUNT_LIMIT = 2
const OTP_BYPASS_EMAILS = new Set([
  'testflight@audius.co',
  'playstore@audius.co',
  'fb@audius.co'
])

const requiresOtp = async ({ email }) => {
  return !OTP_BYPASS_EMAILS.has(email)
}

const generateOtp = () => {
  let OTP = ''
  for (let i = 0; i < 6; i++) {
    OTP += OTP_CHARS[Math.floor(Math.random() * OTP_CHARS.length)]
  }
  return OTP
}

const formatOtp = (otp) => `${otp.substring(0, 3)} ${otp.substring(3, 6)}`

const validateOtp = async ({ email, otp, redis }) => {
  const storedOtp = await redis.get(`${OTP_REDIS_PREFIX}:${email}`)
  return otp === storedOtp
}

const shouldSendOtp = async ({ email, redis }) => {
  const storedOtp = await redis.get(`${OTP_REDIS_PREFIX}:${email}`)
  const otpCount = await redis.get(
    `${OTP_REDIS_PREFIX}:${email}:${OTP_COUNT_REDIS_POSTFIX}`
  )
  return !storedOtp || Number(otpCount) < OTP_COUNT_LIMIT
}

const updateOtpCount = async ({ email, redis }) => {
  const otpCountKey = `${OTP_REDIS_PREFIX}:${email}:${OTP_COUNT_REDIS_POSTFIX}`
  const otpCount = await redis.get(otpCountKey)

  await redis.set(
    otpCountKey,
    Number(otpCount) + 1,
    'EX',
    OTP_EXPIRATION_SECONDS
  )
}

const sendOtp = async ({ email, redis, sendgrid }) => {
  const otp = generateOtp()
  const formattedOtp = formatOtp(otp)
  const copyrightYear = new Date().getFullYear().toString()

  const emailParams = {
    from: 'The Audius Team <team@audius.co>',
    to: email,
    subject: `${formattedOtp} is your Audius verification code`,
    html: getOtpEmail({ otp: formattedOtp, copyrightYear }),
    text: getOtpEmailText({ otp: formattedOtp, copyrightYear }),
    trackingSettings: DISABLE_TRACKING
  }

  await redis.set(
    `${OTP_REDIS_PREFIX}:${email}`,
    otp,
    'EX',
    OTP_EXPIRATION_SECONDS
  )

  await updateOtpCount({ email, redis })

  if (sendgrid) {
    await sendgrid.send(emailParams)
  }
}

module.exports = {
  requiresOtp,
  validateOtp,
  shouldSendOtp,
  sendOtp
}
