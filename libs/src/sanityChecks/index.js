const isCreator = require('./isCreator')
const syncNodes = require('./syncNodes')
const rolloverNodes = require('./rolloverNodes')
const recoveryEmail = require('./needsRecoveryEmail')

// Checks to run at startup to ensure a user is in a good state.
class SanityChecks {
  constructor (libsInstance) {
    this.libs = libsInstance
  }

  /**
   * Runs sanity checks
   * @param {Set<string>} creatorNodeWhitelist
   */
  async run (creatorNodeWhitelist = null) {
    await isCreator(this.libs)
    await syncNodes(this.libs)
    await rolloverNodes(this.libs, creatorNodeWhitelist)
    await recoveryEmail(this.libs)
  }
}

module.exports = SanityChecks
