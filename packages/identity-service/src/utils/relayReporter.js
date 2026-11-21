const AnalyticsProvider = require('../analytics')

const eventName = (event) => `Relay: ${event}`

module.exports = class RelayReporter {
  constructor({ shouldReportAnalytics = true }) {
    this.shouldReportAnalytics = shouldReportAnalytics
    this.analyticsProvider = new AnalyticsProvider()
  }

  async reportStart({
    userId,
    contractAddress,
    nethermindContractAddress,
    senderAddress
  }) {
    await this.report({
      eventName: eventName('Start'),
      userId,
      data: {
        contractAddress,
        nethermindContractAddress,
        senderAddress
      }
    })
  }

  async reportSuccess({
    chain,
    userId,
    totalTime,
    txSubmissionTime,
    contractAddress,
    nethermindContractAddress,
    senderAddress
  }) {
    await this.report({
      eventName: eventName('Success'),
      userId,
      data: {
        chain,
        totalTime,
        txSubmissionTime,
        contractAddress,
        nethermindContractAddress,
        senderAddress
      }
    })
  }

  async reportError({
    chain,
    userId,
    totalTime,
    txSubmissionTime,
    contractAddress,
    nethermindContractAddress,
    senderAddress,
    errMsg
  }) {
    await this.report({
      eventName: eventName('Error'),
      userId,
      data: {
        chain,
        totalTime,
        txSubmissionTime,
        contractAddress,
        nethermindContractAddress,
        senderAddress,
        errMsg
      }
    })
  }

  async report({ eventName, userId, data }) {
    try {
      if (this.shouldReportAnalytics) {
        this.analyticsProvider.track(eventName, userId, data)
      }
    } catch (e) {
      console.error(`RelayReporter error: ${JSON.stringify(e)}`)
    }
  }
}
