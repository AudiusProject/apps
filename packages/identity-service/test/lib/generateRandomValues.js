const generateRandomUUID = () =>
  'a'.concat(
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
  )

const generateRandomNaturalNumber = () => Math.floor(Math.random() * 10000)

const generateRandomPort = () => Math.floor(Math.random() * 65536)

const generateRandomBoolean = () => {
  const zeroOrOne = Math.floor(Math.random() * 2)
  return Boolean(zeroOrOne)
}

const generateRandomLogLevel = () => {
  const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace']
  const zeroThroughFive = Math.floor(Math.random() * 5)
  return logLevels[zeroThroughFive]
}

module.exports = {
  generateRandomUUID,
  generateRandomPort,
  generateRandomNaturalNumber,
  generateRandomBoolean,
  generateRandomLogLevel
}
