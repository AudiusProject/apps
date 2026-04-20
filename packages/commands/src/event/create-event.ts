import chalk from 'chalk'
import { Command, program } from '@commander-js/extra-typings'

import {
  EventEventTypeEnum,
  EventEntityTypeEnum,
  decodeHashId,
  encodeHashId
} from '@audius/sdk'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'

export const createEventCommand = new Command('create')
  .description('Create a new event (e.g. remix contest) on a target entity')
  .argument('<entityId>', 'The ID of the entity the event is attached to', (value) => {
    return decodeHashId(value)!
  })
  .option(
    '-T, --event-type <eventType>',
    'Event type',
    (value) => value as EventEventTypeEnum,
    EventEventTypeEnum.RemixContest
  )
  .option(
    '-t, --entity-type <entityType>',
    'Target entity type',
    (value) => value as EventEntityTypeEnum,
    EventEntityTypeEnum.Track
  )
  .option(
    '-e, --end-date <endDate>',
    'End date (ISO string, optional)'
  )
  .option(
    '-d, --event-data <eventData>',
    'Event data as a JSON string, e.g. \'{"description":"remix my track","winners":[]}\''
  )
  .option('-f, --from <from>', 'The account to create the event from')
  .action(async (entityId, { from, eventType, entityType, endDate, eventData }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = decodeHashId(await getCurrentUserId())!

    try {
      const eventId = await audiusSdk.events.generateEventId()
      const response = await audiusSdk.events.createEvent({
        userId,
        eventId,
        eventType,
        entityType,
        entityId,
        endDate,
        eventData: eventData ? JSON.parse(eventData) : undefined
      })

      console.log(chalk.green('Success!'))
      console.log(chalk.yellow.bold('Event ID:'), eventId)
      console.log(chalk.yellow.bold('Event ID (hashid):'), encodeHashId(eventId))
      console.log(chalk.yellow.bold('Event Type:'), eventType)
      console.log(chalk.yellow.bold('Entity:'), `${entityType}#${entityId}`)
      console.log(chalk.gray('Tx:'), JSON.stringify(response, null, 2))
    } catch (err) {
      program.error((err as Error).message)
    }

    process.exit(0)
  })
