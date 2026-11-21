const DEFAULT_BATCH_SIZE = 10

export type Recording = {
  name: string
  duration: number
}

type TimerConfig = {
  name: string
  batch?: boolean
  batchSize?: number
}

export class Timer {
  config: TimerConfig
  record: (record: Recording) => void

  private totalCount: number
  private rollingAverage: number

  constructor(
    config: TimerConfig,
    record: ({ name, duration }: Recording) => void
  ) {
    this.config = config
    this.record = record

    this.totalCount = 0
    this.rollingAverage = 0
  }

  start = () => {
    const startTime = Date.now()
    return startTime
  }

  end = (start: number) => {
    const duration = Date.now() - start

    if (this.config.batch) {
      const newRollingAverage =
        (this.rollingAverage * this.totalCount + duration) /
        (this.totalCount + 1)
      this.totalCount = this.totalCount + 1
      this.rollingAverage = newRollingAverage

      if (this.totalCount >= (this.config.batchSize || DEFAULT_BATCH_SIZE)) {
        this.record({
          name: this.config.name,
          duration: this.rollingAverage
        })
        this.totalCount = 0
        this.rollingAverage = 0
      }
    } else {
      this.record({ name: this.config.name, duration })
    }
  }
}
