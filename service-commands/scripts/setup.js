const ServiceCommands = require('../src/index')
const { program } = require('commander')
const { allUp, Service, SetupCommand, runSetupCommand } = ServiceCommands

const NUM_CREATOR_NODES = 2
const SERVICE_INSTANCE_NUMBER = 1

const printOptions = () => {
  console.log('Services:')
  console.log(Object.values(Service))
  console.log('Actions:')
  console.log(Object.values(SetupCommand))
  console.log('\nUsage:')
  console.log('node setup.js run <service> <command>\n')
  console.log('\nExamples:')
  console.log('node setup.js run network up')
  console.log('node setup.js run ipfs up')
  console.log('node setup.js run ipfs-2 up')
  console.log('node setup.js run contracts up')
  console.log('-----------------------------------')
}

const findService = service => {
  const serviceArray = Object.values(Service).filter(x => x === service)
  if (serviceArray.length === 0) {
    throw new Error(`No service found matching ${service}.`)
  }
  if (serviceArray.length !== 1) {
    throw new Error(`Found ${serviceArray} matching values`)
  }
  return serviceArray[0]
}

const findCommand = command => {
  const cmdArray = Object.values(SetupCommand).filter(x => x === command)
  if (cmdArray.length === 0) {
    throw new Error(`No command found matching ${service}. Options: ${Service}`)
  }
  if (cmdArray.length !== 1) {
    throw new Error(`Found ${cmdArray} matching values`)
  }
  return cmdArray[0]
}

program
  .command('up')
  .description('Bring up all services')
  .option(
    '-nc, --num-cnodes <number>',
    'number of creator nodes',
    NUM_CREATOR_NODES.toString()
  )
  .action(async opts => {
    const numCnodes = parseInt(opts.numCnodes)
    await allUp({ numCreatorNodes: numCnodes })
  })

program
  .command('down')
  .description('Bring down all services')
  .action(async () => {
    console.log('Bringing down services...')
    await runSetupCommand(Service.ALL, SetupCommand.DOWN)
  })

program
  .command('restart')
  .description(
    'Convenience command to restart services: calls down and then up.'
  )
  .option(
    '-nc, --num-cnodes <number>',
    'number of creator nodes',
    NUM_CREATOR_NODES.toString()
  )
  .action(async opts => {
    console.log('Restarting services...')
    const numCnodes = parseInt(opts.numCnodes)
    await runSetupCommand(Service.ALL, SetupCommand.DOWN)
    await allUp({ numCreatorNodes: numCnodes })
  })

program
  .command('run <service> [command]')
  .description('Execute a service command')
  .option(
    '-i, --instance-num <num>',
    'service instance number',
    SERVICE_INSTANCE_NUMBER.toString()
  )
  .action(async (service, command, opts) => {
    try {
      if (!service || !command) {
        throw new Error('Failed to parse arguments')
      }
      let options = {}

      const serviceName = findService(service)
      const setupCommand = findCommand(command)

      if (serviceName === Service.CREATOR_NODE) {
        const serviceNumber = parseInt(opts.instanceNum)
        if (serviceNumber < 1) {
          throw new Error(
            `Valid instance number required, >0 - found ${opts.instanceNum}`
          )
        }
        console.log(`Creator node instance ${serviceNumber}`)
        options = { serviceNumber }
      }

      await runSetupCommand(serviceName, setupCommand, options)
    } catch (e) {
      printOptions()
      throw e
    }
  })

program.parse(process.argv)
