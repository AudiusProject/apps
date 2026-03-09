import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'

export const createDeveloperAppCommand = new Command('create')
  .description('Create a new developer app')
  .argument('<name>', 'The name of the developer app')
  .option('-f, --from <from>', 'The handle of the user creating the app')
  .option('-d, --description <description>', 'A description for the app')
  .option('--image-url <imageUrl>', 'An image URL for the app')
  .action(async (name, { from, description, imageUrl }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const result = await audiusSdk.developerApps.createDeveloperApp({
      userId,
      metadata: { name, description, imageUrl }
    })

    console.log(chalk.green(`Developer app "${name}" created successfully.`))
    console.log(chalk.cyan('API Key:    '), result.apiKey)
    console.log(chalk.cyan('API Secret: '), result.apiSecret)
    if (result.bearerToken) {
      console.log(chalk.cyan('Bearer Token:'), result.bearerToken)
    }
  })

export const grantDeveloperAppAccessCommand = new Command('grant')
  .description('Grant your account access to a developer app')
  .argument('<appApiKey>', 'The API key of the developer app')
  .option(
    '-f, --from <from>',
    'The handle of the user granting access to the app'
  )
  .action(async (appApiKey, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    await audiusSdk.grants.createGrant({ userId, appApiKey })
    console.log(
      chalk.green(`Access granted to developer app with key: ${appApiKey}`)
    )
  })

export const developerAppCommand = new Command('developer-app')
  .description('Commands for managing developer apps')
  .addCommand(createDeveloperAppCommand)
  .addCommand(grantDeveloperAppAccessCommand)
