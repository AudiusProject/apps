const { setEmitFlags } = require('typescript')

class LogTimer {
  constructor(job) {
    this.job = job
    this.initTime = process.hrtime()
    this.logTime = process.hrtime()
    this.logs = []
    this.timers = {}
    this.durations = {}
    this.context = {}
  }

  startTime(label) {
    this.timers[label] = process.hrtime()
  }

  getDuration(hrtime) {
    return (
      process.hrtime(hrtime)[0] * 1000 +
      process.hrtime(hrtime)[1] / 1000000
    ).toFixed(3)
  }

  endTime(label) {
    if (this.timers[label]) {
      const duration = this.getDuration(this.timers[label])
      this.durations[label] = duration
    }
  }

  addLog(log) {
    const currentTime = process.hrtime()
    const duration = this.getDuration(this.logTime)
    this.logs.push(`${log} (duration ${duration} ms)`)
    this.logTime = currentTime
  }

  addContext(key, value) {
    this.context[key] = value
  }

  getContext() {
    return {
      job: this.job,
      logs: this.logs.join(',\n'),
      totalTime: this.getDuration(this.initTime),
      ...this.durations,
      ...this.context
    }
  }
}

module.exports = { LogTimer }
