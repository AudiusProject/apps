import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'

export const createDeveloperAppCommand = new Command('create')
  .description('Create a new developer app')
  .argument('<name>', 'The name of the developer app')
  .option('-f, --from <from>', 'The handle of the user creating the app')
  .option('-d, --description <description>', 'A description for the app')
  .option('--image-url <imageUrl>', 'An image URL for the app')
  .option(
    '--redirect-uri <redirectUri>',
    'A redirect URI for the app (can be specified multiple times)',
    (val: string, prev: string[]) => [...prev, val],
    [] as string[]
  )
  .action(async (name, { from, description, imageUrl, redirectUri }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const result = await audiusSdk.developerApps.createDeveloperApp({
      userId,
      metadata: {
        name,
        description,
        imageUrl,
        redirectUris: redirectUri.length ? redirectUri : undefined
      }
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

export const updateDeveloperAppCommand = new Command('update')
  .description('Update an existing developer app')
  .argument('<appApiKey>', 'The API key of the developer app to update')
  .argument('<name>', 'The new name for the app')
  .option('-f, --from <from>', 'The handle of the user who owns the app')
  .option('-d, --description <description>', 'A new description for the app')
  .option('--image-url <imageUrl>', 'A new image URL for the app')
  .option(
    '--redirect-uri <redirectUri>',
    'A redirect URI for the app (can be specified multiple times; replaces existing URIs)',
    (val: string, prev: string[]) => [...prev, val],
    [] as string[]
  )
  .action(
    async (appApiKey, name, { from, description, imageUrl, redirectUri }) => {
      const audiusSdk = await initializeAudiusSdk({ handle: from })
      const userId = await getCurrentUserId()

      await audiusSdk.developerApps.updateDeveloperApp({
        userId,
        address: appApiKey,
        metadata: {
          name: name,
          description,
          imageUrl,
          redirectUris: redirectUri.length ? redirectUri : undefined
        }
      })

      console.log(
        chalk.green(`Developer app "${appApiKey}" updated successfully.`)
      )
    }
  )

export const getDeveloperAppCommand = new Command('get')
  .description('Get a developer app by its API key')
  .argument('<appApiKey>', 'The API key of the developer app')
  .action(async (appApiKey) => {
    const audiusSdk = await initializeAudiusSdk()
    const { data } = await audiusSdk.developerApps.getDeveloperApp({
      address: appApiKey
    })
    console.info(JSON.stringify(data, undefined, 2))
  })

export const listDeveloperAppsCommand = new Command('list')
  .description('List your developer apps')
  .option(
    '-f, --from <from>',
    'The handle of the user whose developer apps to list'
  )
  .action(async ({ from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const { data } = await audiusSdk.developerApps.getDeveloperApps({
      id: userId
    })
    console.info(JSON.stringify(data, undefined, 2))
  })

export const developerAppCommand = new Command('developer-app')
  .description('Commands for managing developer apps')
  .addCommand(createDeveloperAppCommand)
  .addCommand(getDeveloperAppCommand)
  .addCommand(updateDeveloperAppCommand)
  .addCommand(grantDeveloperAppAccessCommand)
  .addCommand(listDeveloperAppsCommand)
