const config = require('./config')
const { logger } = require('./logging')

const accessKeyId = config.get('awsAccessKeyId')
const secretAccessKey = config.get('awsSecretAccessKey')

// AWS SNS init
const AWS = require('aws-sdk')
const sns = new AWS.SNS({
  accessKeyId,
  secretAccessKey,
  region: 'us-west-1'
})

// the aws sdk doesn't like when you set the function equal to a variable and try to call it
// eg. const func = sns.<functionname>; func() returns an error, so util.promisify doesn't work
function _promisifySNS(functionName) {
  return function (...args) {
    return new Promise(function (resolve, reject) {
      if (!accessKeyId || !secretAccessKey) {
        reject(new Error('Missing SNS config'))
      }
      sns[functionName](...args, function (err, data) {
        if (err) {
          logger.debug(`Error sending to SNS: ${err}`)
          reject(err)
        } else resolve(data)
      })
    })
  }
}

const createPlatformEndpoint = _promisifySNS('createPlatformEndpoint')
const deleteEndpoint = _promisifySNS('deleteEndpoint')

module.exports = {
  createPlatformEndpoint,
  deleteEndpoint
}
