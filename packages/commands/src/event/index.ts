import { Command } from '@commander-js/extra-typings'
import { createEventCommand } from './create-event.js'
import { followEventCommand } from './follow-event.js'
import { unfollowEventCommand } from './unfollow-event.js'

export const eventCommand = new Command('event')
  .description('Commands that create, follow, or unfollow events')
  .addCommand(createEventCommand)
  .addCommand(followEventCommand)
  .addCommand(unfollowEventCommand)
