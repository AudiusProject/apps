import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'
import { decodeHashId, encodeHashId } from '@audius/sdk'
import { outputFormatOption } from '../common-options.js'

type CommentEntityType = 'Track' | 'FanClub' | 'Event'

export const createCommentCommand = new Command('create')
  .description('Create a new comment')
  .argument('<entityId>', 'The ID of the entity to comment on (hashid or numeric id)')
  .argument('[comment]', 'The content of the comment', 'This is a comment')
  .option(
    '-t, --entity-type <entityType>',
    'The type of entity to comment on (Track | FanClub | Event)',
    (value) => value as CommentEntityType,
    'Track' as CommentEntityType
  )
  .option(
    '-p, --parent-comment-id <parentCommentId>',
    'The ID of the parent comment (numeric)',
    (value) => {
      const asNumber = Number(value)
      return Number.isFinite(asNumber) && !value.includes('-')
        ? asNumber
        : decodeHashId(value)!
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
      entityIdArg,
      comment,
      { from, entityType, parentCommentId, mentions }
    ) => {
      const audiusSdk = await initializeAudiusSdk({ handle: from })
      const userId = await getCurrentUserId()

      // createCommentWithEntityManager expects hashid strings (the zod HashId
      // schema decodes them to numeric). Accept either a hashid or a numeric
      // id on the CLI and normalize here.
      const entityIdHash = /^\d+$/.test(entityIdArg)
        ? encodeHashId(Number(entityIdArg))!
        : entityIdArg

      const res = await audiusSdk.comments.createCommentWithEntityManager({
        userId,
        entityId: entityIdHash,
        entityType,
        body: comment,
        parentCommentId,
        mentions
      })
      const commentId = res.commentId
      console.log(chalk.green('Success!'))
      console.log(chalk.yellow.bold('Comment ID:'), commentId)
      console.log(chalk.yellow.bold('Comment ID #:'), decodeHashId(commentId!))
      console.log(chalk.yellow.bold('Comment Body:'), comment)
    }
  )
