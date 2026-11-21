const assert = require('assert')

const { time } = require('@openzeppelin/test-helpers')
const nock = require('nock')

const helpers = require('./helpers')

const { getRandomLocalhost, audiusInstance: audius0 } = helpers
const initializeLibConfig = helpers.initializeLibConfig
const ethContractsConfig = require('../src/eth-contracts/config.json')
const { AudiusLibs } = require('../src/AudiusLibs')

const { initial } = require('lodash')

const { deregisterSPEndpoint, convertAudsToWeiBN } = require('./helpers')

let token
let ownerWallet
let accounts
let audius1
let audius2
let sp1
let sp2

const assertThrows = async (
  blockOrPromise,
  expectedErrorCode,
  expectedReason
) => {
  try {
    typeof blockOrPromise === 'function'
      ? await blockOrPromise()
      : await blockOrPromise
  } catch (error) {
    assert(
      error.message.search(expectedErrorCode) > -1,
      `Expected error code "${expectedErrorCode}" but failed with "${error}" instead.`
    )
    return error
  }
  assert(
    false,
    `Expected "${expectedErrorCode}"${
      expectedReason ? ` (with reason: "${expectedReason}")` : ''
    } but it did not fail`
  )
}

const assertRevert = async (blockOrPromise, expectedReason) => {
  const error = await assertThrows(blockOrPromise, 'revert', expectedReason)
  if (!expectedReason) {
    return
  }
  const expectedMsgFound = error.message.indexOf(expectedReason) >= 0
  assert.equal(expectedMsgFound, true, 'Expected revert reason not found')
}

describe('Staking tests', () => {
  const testServiceType = 'discovery-provider'

  before(async function () {
    await audius0.init()
    token = audius0.ethContracts.AudiusTokenClient
    accounts = await audius0.ethWeb3Manager.getWeb3().eth.getAccounts()

    await audius0.ethContracts.GovernanceClient.setVotingPeriod(1)
    await audius0.ethContracts.GovernanceClient.setExecutionDelay(0)
    await audius0.ethContracts.ServiceProviderFactoryClient.updateDecreaseStakeLockupDuration(
      10
    )
    await audius0.ethContracts.DelegateManagerClient.updateUndelegateLockupDuration(
      10
    )

    ownerWallet = accounts[0]
    sp1 = accounts[1]
    sp2 = accounts[2]

    const libsConfig1 = await initializeLibConfig(sp1)
    assert(
      ethContractsConfig.ownerWallet !== libsConfig1.ownerWallet,
      'New wallet addr'
    )
    audius1 = new AudiusLibs(libsConfig1)
    await audius1.init()

    const libsConfig2 = await initializeLibConfig(accounts[2])
    assert(
      ethContractsConfig.ownerWallet !== libsConfig2.ownerWallet,
      'New wallet addr'
    )
    audius2 = new AudiusLibs(libsConfig2)
    await audius2.init()

    await token.transfer(
      sp1,
      convertAudsToWeiBN(audius1.ethWeb3Manager.getWeb3(), 2000000)
    )
    await token.transfer(
      sp2,
      convertAudsToWeiBN(audius1.ethWeb3Manager.getWeb3(), 2000000)
    )
  })

  it('initial staking contract state', async function () {
    const tokenAddr = await audius0.ethContracts.StakingProxyClient.token()
    assert(
      token.contractAddress,
      tokenAddr,
      'Expect correct token address from staking proxy'
    )
    const supportsHistory =
      await audius0.ethContracts.StakingProxyClient.supportsHistory()
    assert.equal(supportsHistory, true, 'History support required')
    assert.equal(
      await audius0.ethContracts.StakingProxyClient.totalStaked(),
      0,
      'Expect no stake on init'
    )
  })

  describe('Registration', () => {
    let initialSPBalance
    let testEndpt
    let initialStake
    let defaultStake

    beforeEach(async () => {
      initialSPBalance = await token.balanceOf(sp1)
      testEndpt = getRandomLocalhost()

      let path = '/version'
      let response = {
        service: testServiceType,
        version: '0.0.1'
      }

      if (testServiceType === 'discovery-provider') {
        path = '/health_check?allow_unregistered=true'
        response = { data: { ...response } }
      }

      nock(testEndpt).get(path).reply(200, response)

      initialStake =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      defaultStake = convertAudsToWeiBN(
        audius1.ethWeb3Manager.getWeb3(),
        210000
      )

      const tx =
        await audius1.ethContracts.ServiceProviderFactoryClient.register(
          testServiceType,
          testEndpt,
          defaultStake
        )
    })

    afterEach(async () => {
      await deregisterSPEndpoint(audius1, sp1, testServiceType)
    })

    it('register service provider + stake', async function () {
      const newBalance = await token.balanceOf(sp1)
      const expectedNewBalance = initialSPBalance.sub(defaultStake)
      assert(newBalance.eq(expectedNewBalance), 'Expect decrease in bal')

      const staked =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = initialStake.add(defaultStake)
      assert(staked.eq(expectedStaked), 'Expect increase in stake')
    })

    it('increases service provider stake', async function () {
      const preIncreaseBalance = await token.balanceOf(sp1)
      const preIncreaseStake =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const tx =
        await audius1.ethContracts.ServiceProviderFactoryClient.increaseStake(
          defaultStake
        )

      const newBalance = await token.balanceOf(sp1)
      const expectedBalance = preIncreaseBalance.sub(defaultStake)
      assert(newBalance.eq(expectedBalance), 'Expect decrease in balance')
      const totalStaked =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = preIncreaseStake.add(defaultStake)
      assert(totalStaked.eq(expectedStaked), 'Expect increase in stake')

      assertRevert(
        audius2.ethContracts.ServiceProviderFactoryClient.increaseStake(
          defaultStake
        ),
        'incorrect owner'
      )
    })

    it('decreases service provider stake', async () => {
      const preDecreaseBal = await token.balanceOf(sp1)
      const preDecreaseStake =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)

      const decreaseAmount = audius1.ethWeb3Manager.getWeb3().utils.toBN(10000)

      const lockupExpiryBlock =
        await audius1.ethContracts.ServiceProviderFactoryClient.requestDecreaseStake(
          decreaseAmount
        )
      await time.advanceBlockTo(lockupExpiryBlock)

      await audius1.ethContracts.ServiceProviderFactoryClient.decreaseStake(
        lockupExpiryBlock
      )

      const newBalance = await token.balanceOf(sp1)
      const expectedBalance = preDecreaseBal.add(decreaseAmount)
      assert(newBalance.eq(expectedBalance), 'Expect increase in balance')

      const totalStaked =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = preDecreaseStake.sub(decreaseAmount)
      assert(totalStaked.eq(expectedStaked), 'Expect decrease in stake')

      assertRevert(
        audius2.ethContracts.ServiceProviderFactoryClient.decreaseStake(
          decreaseAmount
        ),
        'incorrect owner'
      )

      const currentStake =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const increaseAmt = audius1.ethWeb3Manager.getWeb3().utils.toBN(10)
      const invalidDecreaseAmount = currentStake.add(increaseAmt)
      assertRevert(
        audius1.ethContracts.ServiceProviderFactoryClient.decreaseStake(
          invalidDecreaseAmount
        ),
        'subtraction overflow'
      )
    })
  })

  describe('Deregistration', () => {
    let initialSPBalance
    let testEndpt
    let initialStake
    let defaultStake
    beforeEach(async () => {
      initialSPBalance = await token.balanceOf(sp1)
      testEndpt = getRandomLocalhost()

      let path = '/version'
      let response = {
        service: testServiceType,
        version: '0.0.1'
      }

      if (testServiceType === 'discovery-provider') {
        path = '/health_check?allow_unregistered=true'
        response = { data: { ...response } }
      }

      nock(testEndpt).get(path).reply(200, response)

      initialStake =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      defaultStake = convertAudsToWeiBN(
        audius1.ethWeb3Manager.getWeb3(),
        210000
      )

      const tx =
        await audius1.ethContracts.ServiceProviderFactoryClient.register(
          testServiceType,
          testEndpt,
          defaultStake
        )
    })

    it('deregisters service provider + recover stake', async function () {
      const initialBalance = await token.balanceOf(sp1)
      const preDeregisterStake =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)

      nock(testEndpt).get('/version').reply(200, {
        service: testServiceType,
        version: '0.0.1'
      })

      const tx =
        await audius1.ethContracts.ServiceProviderFactoryClient.deregister(
          testServiceType,
          testEndpt
        )

      const lockupExpiryBlock =
        await audius1.ethContracts.ServiceProviderFactoryClient.getLockupExpiry(
          audius1.ethWeb3Manager.getWalletAddress()
        )

      await time.advanceBlockTo(lockupExpiryBlock)

      await audius1.ethContracts.ServiceProviderFactoryClient.decreaseStake(
        lockupExpiryBlock
      )

      const newBalance = await token.balanceOf(sp1)
      const expectedBalance = initialBalance.add(preDeregisterStake)
      assert(
        newBalance.eq(expectedBalance),
        'Expect stake returned after deregistration'
      )

      const totalStaked =
        await audius1.ethContracts.StakingProxyClient.totalStakedFor(sp1)
      const expectedStaked = preDeregisterStake.sub(defaultStake)
      assert(
        totalStaked.isZero(),
        'Expect decrease in stake after deregistration'
      )
    })
  })
})
