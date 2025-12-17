const axios = require('axios')
const { getIP } = require('../utils/antiAbuse')
const {
  errorResponseBadRequest,
  handleResponse,
  successResponse,
  errorResponse
} = require('../apiHelpers')
const config = require('../config')
const { logger } = require('../logging')

const isEU = (countryCode) => {
  return [
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
    'GB',
    'UK'
  ].includes(countryCode)
}

module.exports = function (app) {
  app.get(
    '/location',
    handleResponse(async (req) => {
      let ip = getIP(req)
      if (!ip) {
        return errorResponseBadRequest('Unexpectedly no IP')
      }
      if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7)
      }
      const url = `https://creatornode.audius.co/storage.v1.StorageService/GetIPData?ip=${ip}`
      try {
        const res = await axios({
          method: 'get',
          url
        })
        return successResponse({
          ...res.data,
          in_eu: isEU(res.data.countryCode)
        })
      } catch (e) {
        logger.error(`Got error in location: ${e.response?.data}`)
        return errorResponse(e.response?.status, e.response?.data)
      }
    })
  )
}
