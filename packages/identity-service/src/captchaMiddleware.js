const config = require('./config')
const models = require('./models')

const verifyAndRecordCaptcha = async ({
  token,
  walletAddress,
  url,
  logger,
  captcha
}) => {
  let score, ok, hostname
  if (token) {
    try {
      ;({ score, ok, hostname } = await captcha.verify(token))

      if (score !== undefined && score !== null && hostname) {
        models.BotScores.create({
          walletAddress,
          recaptchaScore: score,
          recaptchaContext: url,
          recaptchaHostname: hostname
        })
      }
    } catch (e) {
      logger.error(
        `CAPTCHA - Error with calculating or recording recaptcha score for wallet=${walletAddress}`,
        e
      )
    }

    if (!ok)
      logger.warn(
        `CAPTCHA - Failed captcha with score=${score} for wallet=${walletAddress}`
      )
  } else {
    logger.warn('CAPTCHA - No captcha found on request')
  }
}

async function captchaMiddleware(req, res, next) {
  if (!config.get('recaptchaServiceKey')) {
    req.logger.warn(
      `CAPTCHA - No service key found. Not calculating score at ${req.url} for wallet=${req.body.walletAddress}`
    )
  } else {
    const libs = req.app.get('audiusLibs')

    verifyAndRecordCaptcha({
      token: req.body.token,
      walletAddress: req.body.walletAddress || req.body.senderAddress,
      url: req.url,
      logger: req.logger,
      captcha: libs.captcha
    })
  }
  next()
}

module.exports = captchaMiddleware
