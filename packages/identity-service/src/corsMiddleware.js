const cors = require('cors')

const excludedRoutes = ['/tiktok/access_token']

const corsMiddleware = () => {
  const defaultCors = cors()

  return (req, res, next) => {
    if (excludedRoutes.includes(req.url.toLowerCase())) {
      next()
    } else {
      defaultCors(req, res, next)
    }
  }
}

module.exports = corsMiddleware
