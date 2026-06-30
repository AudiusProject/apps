import chalk from 'chalk'
import { Command } from '@commander-js/extra-typings'

import { getCurrentUserId, initializeAudiusSdk } from '../utils.js'

export const addManagerCommand = new Command('add-manager')
  .command('add')
  .description('Create a pending manager request for a user')
  .argument('<handle>', 'The handle of the manager')
  .option('-f, --from <from>', 'The account that will be managed')
  .action(async (handle, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const { data: manager } = await audiusSdk.users.getUserByHandle({
      handle: handle!
    })
    const { id: managerUserId } = manager!

    await audiusSdk.grants.addManager({ userId, managerUserId })
    console.log(chalk.green(`Manager request created for ${handle}.`))
  })

export const approveManagerCommand = new Command('approve')
  .description('Approve a pending manager request')
  .argument('<handle>', 'The handle of the user to be managed')
  .option('-f, --from <from>', 'The manager account handle')
  .action(async (handle, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const { data: grantor } = await audiusSdk.users.getUserByHandle({
      handle
    })
    const { id: grantorUserId } = grantor!

    await audiusSdk.grants.approveGrant({ userId, grantorUserId })
    console.log(chalk.green(`Manager request approved!`))
  })

export const rejectManagerCommand = new Command('reject')
  .description('Reject a pending manager request')
  .argument('<handle>', 'The handle of the user to be managed')
  .option('-f, --from <from>', 'The manager account handle')
  .action(async (handle, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const { data: grantor } = await audiusSdk.users.getUserByHandle({ handle })
    const { id: grantorUserId } = grantor!

    await audiusSdk.grants.rejectGrant({ userId, grantorUserId })
    console.log(chalk.green(`Manager request rejected.`))
  })

export const removeManagerCommand = new Command('remove')
  .description('Remove a manager')
  .argument('<handle>', 'The handle of the manager')
  .option('-f, --from <from>', 'The handle of the manager user')
  .action(async (handle, { from }) => {
    const audiusSdk = await initializeAudiusSdk({ handle: from })
    const userId = await getCurrentUserId()

    const { data: manager } = await audiusSdk.users.getUserByHandle({
      handle
    })
    const { id: managerUserId } = manager!

    await audiusSdk.grants.removeManager({ userId, managerUserId })
    console.log(chalk.green(`Manager removed.`))
  })

export const managerCommand = new Command('manager')
  .description('Commands for managing account managers')
  .addCommand(addManagerCommand)
  .addCommand(removeManagerCommand)
  .addCommand(approveManagerCommand)
  .addCommand(rejectManagerCommand)
