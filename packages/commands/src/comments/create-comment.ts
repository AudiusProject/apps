import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'
import { decodeHashId, EntityType } from '@audius/sdk'
import { outputFormatOption } from '../common-options.js'

export const createCommentCommand = new Command('create')
  .description('Create a new comment')
  .argument('<entityId>', 'The ID of the entity to comment on', (value) => {
    return decodeHashId(value)!
  })
  .argument('[comment]', 'The content of the comment', 'This is a comment')
  .option(
    '-t, --entity-type <entityType>',
    'The type of entity to comment on',
    (value) => value as EntityType,
    EntityType.TRACK
  )
  .option(
    '-p, --parent-comment-id <parentCommentId>',
    'The ID of the parent comment',
    (value) => {
      return decodeHashId(value)!
    }
  )
  .option(
    '-m, --mentions <mentions...>',
    'List of user IDs to mention',
    (values) => {
      return values.split(',').map((value) => decodeHashId(value)!)
    }
  )
  .option('-f, --from <from>', 'The account to create the comment from')
  .addOption(outputFormatOption)
  .action(
    async (
      entityId,
      comment,
      { from, entityType, parentCommentId, mentions }
    ) => {
      const audiusSdk = await initializeAudiusSdk({ handle: from })
      const userId = await getCurrentUserId()

      const commentId = await audiusSdk.comments.postComment({
        userId: decodeHashId(userId)!,
        entityId,
        entityType,
        body: comment,
        parentCommentId,
        mentions
      })
      console.log(chalk.green('Success!'))
      console.log(chalk.yellow.bold(`Comment ID:  `), commentId)
      console.log(
        chalk.yellow.bold(`Comment ID #:   `),
        decodeHashId(commentId!)
      )
      console.log(chalk.yellow.bold(`Comment Body:   `), comment)
    }
  )
