// Used for testing purposes only

// Generates a random string by obtaining random value from [0, 1), converting to base 36,
// and getting substring from indexes 2 to 15. Starts with letter 'a' to ensure no num at head
const generateRandomUUID = () =>
  'a'.concat(
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
  )

// Generates a random number from [0, 9999]
// https://stackoverflow.com/questions/29640432/generate-4-digit-random-number-using-substring/29640472
const generateRandomNaturalNumber = () => Math.floor(Math.random() * 10000)

// Generates a random port from [0, 65535]
const generateRandomPort = () => Math.floor(Math.random() * 65536)

// Randomly generates 0 or 1, then returns its converted boolean value
const generateRandomBoolean = () => {
  const zeroOrOne = Math.floor(Math.random() * 2)
  return Boolean(zeroOrOne)
}

// Randomy get log level
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
