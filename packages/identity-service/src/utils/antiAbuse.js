const axios = require('axios')
const config = require('../config.js')
const { logger } = require('../logging')
const models = require('../models')

const aaoEndpoint =
  config.get('aaoEndpoint') || 'https://anti-abuse-oracle.audius.engineering'

const allowRules = new Set([-17, -18])
const blockRelayAbuseErrorCodes = new Set([0, 8, 10, 13, 15, 18])
const blockNotificationsErrorCodes = new Set([7, 9])
const blockEmailsErrorCodes = new Set([0, 1, 2, 3, 4, 8, 10, 13, 15])

/**
 * Gets IP of a user by using the leftmost forwarded-for entry
 * or defaulting to req.ip
 */
const getIP = (req) => {
  const forwardedFor = req.get('X-Forwarded-For')
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim()
    return ip
  }
  return req.ip
}

/**
 * Records or updates the last seen IP for `handle`
 */
const recordIP = async (userIP, handle) => {
  const record = await models.UserIPs.findOne({ where: { handle } })
  if (!record) {
    await models.UserIPs.create({
      handle,
      userIP
    })
  } else {
    // update even if IP has not changed so that we can later use updatedAt value if necessary
    await record.update({ userIP, updatedAt: Date.now() })
  }
}

const getAbuseData = async (handle, reqIP, abbreviated) => {
  const res = await axios.get(
    `${aaoEndpoint}/abuse/${handle}${abbreviated ? '?abbreviated=true' : ''}`,
    {
      headers: {
        'X-Forwarded-For': reqIP
      }
    }
  )
  const { data: rules } = res

  const appliedSuccessRules = rules
    .filter((r) => r.trigger && r.action === 'pass')
    .map((r) => r.rule)
  const allowed = appliedSuccessRules.some((r) => allowRules.has(r))

  if (allowed) {
    return {
      blockedFromRelay: false,
      blockedFromNotifications: false
    }
  }

  const appliedFailRules = rules
    .filter((r) => r.trigger && r.action === 'fail')
    .map((r) => r.rule)

  const blockedFromRelay = appliedFailRules.some((r) =>
    blockRelayAbuseErrorCodes.has(r)
  )
  const blockedFromNotifications = appliedFailRules.some((r) =>
    blockNotificationsErrorCodes.has(r)
  )
  const blockedFromEmails = appliedFailRules.some((r) =>
    blockEmailsErrorCodes.has(r)
  )

  return {
    blockedFromRelay,
    blockedFromNotifications,
    blockedFromEmails,
    appliedRules: appliedFailRules
  }
}

const detectAbuse = async (user, reqIP, abbreviated = false) => {
  if (config.get('skipAbuseCheck') || !user.handle) {
    return
  }

  let blockedFromRelay = false
  let blockedFromNotifications = false
  let blockedFromEmails = false
  let appliedRules = null

  try {
    // Write out the latest user IP to Identity DB - AAO will request it back
    await recordIP(reqIP, user.handle)

    // Perform abuse check conditional on environment
    ;({
      appliedRules,
      blockedFromRelay,
      blockedFromNotifications,
      blockedFromEmails
    } = await getAbuseData(user.handle, reqIP, abbreviated))
    logger.info(
      `detectAbuse: got info for user id ${user.blockchainUserId} handle ${
        user.handle
      }: ${JSON.stringify({
        appliedRules,
        blockedFromRelay,
        blockedFromNotifications,
        blockedFromEmails
      })}`
    )
  } catch (e) {
    logger.warn(`detectAbuse: aao request failed ${e.message}`)
    // If it failed, don't update anything
    return
  }

  // Use !! for nullable columns :(
  if (
    !!user.isBlockedFromRelay !== blockedFromRelay ||
    !!user.isBlockedFromNotifications !== blockedFromNotifications ||
    !!user.isBlockedFromEmails !== blockedFromEmails
  ) {
    logger.info(
      `abuse: state changed for user [${user.handle}], blocked from relay: ${blockedFromRelay}, blocked from notifs: [${blockedFromNotifications}, blocked from emails: ${blockedFromEmails}]`
    )
    await user.update({
      isBlockedFromRelay: blockedFromRelay,
      isBlockedFromNotifications: blockedFromNotifications,
      isBlockedFromEmails: blockedFromEmails,
      appliedRules
    })
  }
}

module.exports = {
  getAbuseAttestation: getAbuseData,
  detectAbuse,
  getIP,
  recordIP
}
