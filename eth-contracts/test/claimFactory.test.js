import * as _lib from './_lib/lib.js'

const AudiusToken = artifacts.require('AudiusToken')
const Registry = artifacts.require('Registry')
const ClaimFactory = artifacts.require('ClaimFactory')
const OwnedUpgradeabilityProxy = artifacts.require('OwnedUpgradeabilityProxy')
const MockServiceProviderFactory = artifacts.require('MockServiceProviderFactory')
const Staking = artifacts.require('Staking')
const encodeCall = require('./encodeCall')

const ownedUpgradeabilityProxyKey = web3.utils.utf8ToHex('OwnedUpgradeabilityProxy')
const serviceProviderFactoryKey = web3.utils.utf8ToHex('ServiceProviderFactory')

const fromBn = n => parseInt(n.valueOf(), 10)

const toWei = (aud) => {
  let amountInAudWei = web3.utils.toWei(
    aud.toString(),
    'ether'
  )

  let amountInAudWeiBN = web3.utils.toBN(amountInAudWei)
  return amountInAudWeiBN
}

const DEFAULT_AMOUNT = toWei(120)

contract('ClaimFactory', async (accounts) => {
  // Local web3, injected by truffle
  let treasuryAddress = accounts[0]
  let proxyOwner = treasuryAddress
  let claimFactory
  let token
  let registry

  let staking
  let staker
  let proxy
  let impl0
  let BN = web3.utils.BN
  let testStakingCallerAddress = accounts[6] // Dummy stand in for sp factory in actual deployment


  const getLatestBlock = async () => {
    return web3.eth.getBlock('latest')
  }

  const approveTransferAndStake = async (amount, staker) => {
    // Transfer default tokens to
    await token.transfer(staker, amount, { from: treasuryAddress })
    // Allow Staking app to move owner tokens
    await token.approve(staking.address, amount, { from: staker })
    // Stake tokens
    await staking.stakeFor(
      staker,
      amount,
      web3.utils.utf8ToHex(''),
      { from: testStakingCallerAddress })
  }

  beforeEach(async () => {
    registry = await Registry.new()
    proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner })
    // Add proxy to registry
    await registry.addContract(ownedUpgradeabilityProxyKey, proxy.address)

    token = await AudiusToken.new({ from: accounts[0] })
    impl0 = await Staking.new()

    // Create initialization data
    let initializeData = encodeCall(
      'initialize',
      ['address', 'address'],
      [token.address, treasuryAddress])

    // Initialize staking contract
    await proxy.upgradeToAndCall(
      impl0.address,
      initializeData,
      { from: proxyOwner })

    staking = await Staking.at(proxy.address)
    staker = accounts[2]

    // Mock SP for test
    let mockSPFactory = await MockServiceProviderFactory.new({ from: accounts[0] })
    await registry.addContract(serviceProviderFactoryKey, mockSPFactory.address)

    // Create new claim factory instance
    claimFactory = await ClaimFactory.new(
      token.address,
      registry.address,
      ownedUpgradeabilityProxyKey,
      serviceProviderFactoryKey,
      { from: accounts[0] })

    // Register new contract as a minter, from the same address that deployed the contract
    await token.addMinter(claimFactory.address, { from: accounts[0] })

    // Permission test address as caller
    await staking.setStakingOwnerAddress(testStakingCallerAddress, { from: treasuryAddress })
  })

  it('Initiate a claim', async () => {
    // Get amount staked
    let totalStaked = await staking.totalStaked()
    assert.isTrue(
      totalStaked.isZero(),
      'Expect zero treasury stake prior to claim funding')

    // Stake default amount
    await approveTransferAndStake(DEFAULT_AMOUNT, staker)

    // Get funds per claim
    let fundsPerRound = await claimFactory.getFundsPerRound()

    await claimFactory.initiateRound()
    await claimFactory.processClaim(staker, 0)

    totalStaked = await staking.totalStaked()

    assert.isTrue(
      totalStaked.eq(fundsPerRound.add(DEFAULT_AMOUNT)),
      'Expect single round of funding + initial stake at this time')

    // Confirm another claim cannot be immediately funded
    await _lib.assertRevert(
      claimFactory.initiateRound(),
      'Required block difference not met')
  })

  it('Initiate multiple rounds, 1x block diff', async () => {
    // Get amount staked
    let totalStaked = await staking.totalStaked()
    assert.isTrue(
      totalStaked.isZero(),
      'Expect zero stake prior to claim funding')

    // Stake default amount
    await approveTransferAndStake(DEFAULT_AMOUNT, staker)

    // Get funds per claim
    let fundsPerClaim = await claimFactory.getFundsPerRound()

    // Initiate round
    await claimFactory.initiateRound()
    await claimFactory.processClaim(staker, 0)
    totalStaked = await staking.totalStaked()

    assert.isTrue(
      totalStaked.eq(fundsPerClaim.add(DEFAULT_AMOUNT)),
      'Expect single round of funding + initial stake at this time')

    // Confirm another round cannot be immediately funded
    await _lib.assertRevert(
      claimFactory.initiateRound(),
      'Required block difference not met')

    let currentBlock = await getLatestBlock()
    let currentBlockNum = currentBlock.number
    let lastClaimBlock = await claimFactory.getLastFundBlock()
    let claimDiff = await claimFactory.getFundingRoundBlockDiff()
    let nextClaimBlock = lastClaimBlock.add(claimDiff)

    // Advance blocks to the next valid claim
    while (currentBlockNum < nextClaimBlock) {
      await _lib.advanceBlock(web3)
      currentBlock = await getLatestBlock()
      currentBlockNum = currentBlock.number
    }

    // No change expected after block diff
    totalStaked = await staking.totalStaked()
    assert.isTrue(
      totalStaked.eq(fundsPerClaim.add(DEFAULT_AMOUNT)),
      'Expect single round of funding + initial stake at this time')

    let accountStakeBeforeSecondClaim = await staking.totalStakedFor(staker)

    // Initiate another round
    await claimFactory.initiateRound()
    await claimFactory.processClaim(staker, 0)
    totalStaked = await staking.totalStaked()
    let finalAcctStake = await staking.totalStakedFor(staker)
    let expectedFinalValue = accountStakeBeforeSecondClaim.add(fundsPerClaim)

    // Note - we convert ouf of BN format here to handle infinitesimal precision loss
    assert.equal(
      fromBn(finalAcctStake),
      fromBn(expectedFinalValue),
      'Expect additional increase in stake after 2nd claim')
  })

  it('Initiate single claim after 2x claim block diff', async () => {
    // Get funds per claim
    let fundsPerClaim = await claimFactory.getFundsPerRound()
    // Get amount staked
    let totalStaked = await staking.totalStaked()
    assert.isTrue(
      totalStaked.isZero(),
      'Expect zero stake prior to claim funding')

    // Stake default amount
    await approveTransferAndStake(DEFAULT_AMOUNT, staker)

    let currentBlock = await getLatestBlock()
    let currentBlockNum = currentBlock.number
    let lastClaimBlock = await claimFactory.getLastFundBlock()
    let claimDiff = await claimFactory.getFundingRoundBlockDiff()
    let twiceClaimDiff = claimDiff.mul(new BN('2'))
    let nextClaimBlock = lastClaimBlock.add(twiceClaimDiff)

    // Advance blocks to the next valid claim
    while (currentBlockNum < nextClaimBlock) {
      await _lib.advanceBlock(web3)
      currentBlock = await getLatestBlock()
      currentBlockNum = currentBlock.number
    }

    // Initiate claim
    await claimFactory.initiateRound()
    await claimFactory.processClaim(staker, 0)
    totalStaked = await staking.totalStaked()

    assert.isTrue(
      totalStaked.eq(fundsPerClaim.add(DEFAULT_AMOUNT)),
      'Expect single round of funding + initial stake at this time')

    // Confirm another round cannot be immediately funded, despite 2x block diff
    await _lib.assertRevert(
      claimFactory.initiateRound(),
      'Required block difference not met')
  })
})
