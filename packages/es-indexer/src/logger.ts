import pino, { stdTimeFunctions } from 'pino'

const formatters = {
  level(label: string) {
    return { level: label.toUpperCase() }
  },
}

export const logger = pino({
  name: `es-indexer`,
  base: undefined,
  timestamp: stdTimeFunctions.isoTime,
  formatters,
})
