const assert = require('assert')
let helpers = require('./helpers')

let audiusInstance = helpers.audiusInstance

before(async function () {
  await audiusInstance.init()
})

it('should call getContract for creatorStorage key', async function () {
  let address =
    await audiusInstance.contracts.RegistryClient.getContract('creatorStorage')
  assert.notStrictEqual(address, helpers.constants['0x0'])
})

it('should call getContract for nonexistent key', async function () {
  let address =
    await audiusInstance.contracts.RegistryClient.getContract('nonexistent')
  assert.strictEqual(address, '0x0000000000000000000000000000000000000000')
})
