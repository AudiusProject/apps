import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import {
  getCurrentUserId,
  initializeAudiusSdk,
  parseBoolean
} from '../utils.js'
import { decodeHashId } from '@audius/sdk'
import { outputFormatOption } from '../common-options.js'

export const reactCommentCommand = new Command('react')
  .description('React to a comment')
  .argument('<commentId>', 'The ID of the comment to react to', (value) => {
    return decodeHashId(value)!
  })
  .argument('entityId', 'The ID of the entity to comment on', (value) => {
    return decodeHashId(value)!
  })
  .argument(
    '[isLiked]',
    'Whether to like (true) or dislike (false) the comment',
    parseBoolean,
    true
  )
  .option('-f, --from <from>', 'The account to create the comment from')
  .addOption(outputFormatOption)
  .action(async (commentId, entityId, isLiked, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()
    await audiusSdk.comments.reactComment({
      userId: decodeHashId(userId)!,
      commentId,
      isLiked,
      trackId: entityId
    })
    console.log(chalk.green('Success!'))
    console.log(chalk.yellow.bold(`Comment Liked:  `), isLiked)
  })
