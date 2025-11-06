import { Command } from '@commander-js/extra-typings'
import { createCommentCommand } from './create-comment'
import { reactCommentCommand } from './react-comment'

export const commentCommand = new Command('comment')
  .description('Commands for creating and managing comments')
  .addCommand(createCommentCommand)
  .addCommand(reactCommentCommand)
