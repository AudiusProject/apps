import * as _lib from '../utils/lib.js'

const Registry = artifacts.require('Registry')
const Staking = artifacts.require('Staking')
const StakingUpgraded = artifacts.require('StakingUpgraded')
const AudiusToken = artifacts.require('AudiusToken')
const MockStakingCaller = artifacts.require('MockStakingCaller')
const AudiusAdminUpgradeabilityProxy = artifacts.require('AudiusAdminUpgradeabilityProxy')

const claimsManagerProxyKey = web3.utils.utf8ToHex('ClaimsManagerProxy')
const delegateManagerKey = web3.utils.utf8ToHex('DelegateManager')
const serviceProviderFactoryKey = web3.utils.utf8ToHex('ServiceProviderFactory')
const governanceKey = web3.utils.utf8ToHex('Governance')
const serviceTypeManagerProxyKey = web3.utils.utf8ToHex('ServiceTypeManagerProxy')
const tokenRegKey = web3.utils.utf8ToHex('TokenKey')

const DEFAULT_AMOUNT = _lib.audToWeiBN(120)
const VOTING_PERIOD = 10
const VOTING_QUORUM = 1

const { expectEvent } = require('@openzeppelin/test-helpers')

contract('Upgrade proxy test', async (accounts) => {
  let proxy
  let staking0
  let staking
  let stakingUpgraded
  let stakingInitializeData
  let mockStakingCaller
  let mockGovAddr
  let registry, governance, token

  // intentionally not using acct0 to make sure no TX accidentally succeeds without specifying sender
  const [, proxyAdminAddress, proxyDeployerAddress] = accounts
  const tokenOwnerAddress = proxyDeployerAddress
  const guardianAddress = proxyDeployerAddress

  const approveAndStake = async (amount, staker, staking) => {
    // Transfer default tokens to
    await token.transfer(staker, amount, { from: proxyDeployerAddress })
    // allow Staking app to move owner tokens
    await token.approve(staking.address, amount, { from: staker })
    // stake tokens
    await mockStakingCaller.stakeFor(
      staker,
      amount)
  }

  beforeEach(async () => {
    // Deploy registry
    registry = await _lib.deployRegistry(artifacts, proxyAdminAddress, proxyDeployerAddress)

    // Deploy + register Governance
    governance = await _lib.deployGovernance(
      artifacts,
      proxyAdminAddress,
      proxyDeployerAddress,
      registry,
      VOTING_PERIOD,
      VOTING_QUORUM,
      guardianAddress
    )
    // await registry.addContract(governanceKey, governance.address, { from: proxyDeployerAddress })

    // Deploy + register AudiusToken
    token = await _lib.deployToken(
      artifacts,
      proxyAdminAddress,
      proxyDeployerAddress,
      tokenOwnerAddress,
      governance.address
    )
    await registry.addContract(tokenRegKey, token.address, { from: proxyDeployerAddress })

    staking0 = await Staking.new({ from: proxyAdminAddress })
    stakingUpgraded = await StakingUpgraded.new({ from: proxyAdminAddress })
    assert.notEqual(staking0.address, stakingUpgraded.address)

    mockStakingCaller = await MockStakingCaller.new()
    mockGovAddr = mockStakingCaller.address

    // Create initialization data
    stakingInitializeData = _lib.encodeCall(
      'initialize',
      ['address', 'address'],
      [token.address, mockGovAddr]
    )

    proxy = await AudiusAdminUpgradeabilityProxy.new(
      staking0.address,
      proxyAdminAddress,
      stakingInitializeData,
      mockGovAddr,
      { from: proxyDeployerAddress }
    )

    // Register mock contract as claimsManager, spFactory, delegateManager
    await mockStakingCaller.initialize(proxy.address, token.address)
    await registry.addContract(claimsManagerProxyKey, mockStakingCaller.address, { from: proxyDeployerAddress })
    await registry.addContract(serviceProviderFactoryKey, mockStakingCaller.address, { from: proxyDeployerAddress })
    await registry.addContract(delegateManagerKey, mockStakingCaller.address, { from: proxyDeployerAddress })
    await registry.addContract(governanceKey, mockStakingCaller.address, { from: proxyDeployerAddress })

    // Setup permissioning to mock caller
    await mockStakingCaller.configurePermissions()
  })

  it('Fails to call Staking contract function before proxy initialization', async () => {
    const mock = await MockStakingCaller.new({ from: proxyAdminAddress })
    await _lib.assertRevert(
      mock.stakeRewards(10, accounts[5], { from: proxyDeployerAddress }),
      "INIT_NOT_INITIALIZED"
    )

    const isInitialized = await mock.isInitialized.call()
    assert.isFalse(isInitialized)
  })

  it('Deployed proxy state', async () => {
    staking = await Staking.at(proxy.address)

    const totalStaked = await staking.totalStaked.call({ from: proxyDeployerAddress })
    assert.equal(totalStaked, 0)

    const impl = await proxy.implementation.call({ from: proxyAdminAddress })
    assert.equal(impl, staking0.address)

  })

  it('fail to call newFunction before upgrade', async () => {
    staking = await StakingUpgraded.at(proxy.address)
    await _lib.assertRevert(staking.newFunction.call({ from: proxyDeployerAddress }), 'revert')
  })

  it('Fail to upgrade proxy from incorrect address', async () => {
    staking = await StakingUpgraded.at(proxy.address)

    await _lib.assertRevert(
      proxy.upgradeTo(stakingUpgraded.address),
      "Caller must be proxy admin or proxy upgrader"
    )
  })

  it('Fail to initialize proxy twice', async () => {
    await _lib.assertRevert(
      mockStakingCaller.initialize(proxy.address, token.address),
      "Contract instance has already been initialized"
    )
  })

  it('upgrade proxy to StakingUpgraded + call newFunction()', async () => {
    // assert proxy.newFunction() not callable before upgrade
    staking = await StakingUpgraded.at(proxy.address)
    await _lib.assertRevert(staking.newFunction.call({ from: proxyDeployerAddress }), 'revert')

    const upgradeTxReceipt = await mockStakingCaller.upgradeTo(stakingUpgraded.address, { from: proxyAdminAddress })
    await expectEvent.inTransaction(upgradeTxReceipt.tx, AudiusAdminUpgradeabilityProxy, 'Upgraded', { implementation: stakingUpgraded.address })

    // Confirm proxy implementation's address has updated to new logic contract
    assert.equal(await proxy.implementation.call({ from: proxyAdminAddress }), stakingUpgraded.address)

    // assert proxy.newFunction() call succeeds after upgrade
    staking = await StakingUpgraded.at(proxy.address)
    const newFunctionResp = await staking.newFunction.call({ from: proxyDeployerAddress })
    assert.equal(newFunctionResp, 5)
  })

  it('Initialize with no governance address and set value from admin', async () => {
    let noGovProxy = await AudiusAdminUpgradeabilityProxy.new(
      staking0.address,
      proxyAdminAddress,
      stakingInitializeData,
      _lib.addressZero,
      { from: proxyDeployerAddress }
    )

    let govAddress = await noGovProxy.getAudiusGovernanceAddress()
    assert.equal(govAddress, _lib.addressZero, 'Expect zero governance addr')

    await _lib.assertRevert(
      noGovProxy.setAudiusGovernanceAddress(mockStakingCaller.address, { from: accounts[7] }),
      'Caller must be proxy admin or proxy upgrade')
    await noGovProxy.setAudiusGovernanceAddress(mockStakingCaller.address, { from: proxyAdminAddress })
    govAddress = await noGovProxy.getAudiusGovernanceAddress()
    assert.equal(govAddress, mockStakingCaller.address, 'Expect updated governance addr')
  })

  it('Get & set contract governance address', async () => {
    const registry2 = await Registry.new()
    await registry2.initialize()

    let proxyGovAddr = await proxy.getAudiusGovernanceAddress.call({ from: proxyAdminAddress })
    assert.equal(proxyGovAddr, mockGovAddr)

    let mockStakingCaller2 = await MockStakingCaller.new()
    let mockGovAddr2 = mockStakingCaller2.address

    await _lib.assertRevert(
      proxy.setAudiusGovernanceAddress(mockGovAddr2, { from: proxyAdminAddress }),
      'Caller must be proxy admin or proxy upgrader')

    await mockStakingCaller.setAudiusGovernanceAddress(mockGovAddr2, { from: proxyAdminAddress })

    proxyGovAddr = await proxy.getAudiusGovernanceAddress.call({ from: proxyAdminAddress })
    assert.equal(proxyGovAddr, mockGovAddr2)
  })

  describe('Test with Staking contract', async () => {
    beforeEach(async () => {
      const spAccount1 = accounts[3]
      const spAccount2 = accounts[4]

      // Transfer 1000 tokens to accounts[1] and accounts[2]
      await token.transfer(spAccount1, 1000, { from: proxyDeployerAddress })
      await token.transfer(spAccount2, 1000, { from: proxyDeployerAddress })

      // Permission test address as caller
      staking = await Staking.at(proxy.address)
    })

    it('upgrade and confirm initial staking state at proxy', async () => {
      assert.equal(await proxy.implementation.call({ from: proxyAdminAddress }), staking0.address)
      assert.equal(await staking.token.call({ from: accounts[3] }), token.address, 'Token is wrong')
      assert.equal((await staking.totalStaked.call({ from: accounts[3] })).valueOf(), 0, 'Initial total staked amount should be zero')
      assert.equal(await staking.supportsHistory({ from: accounts[3] }), true, 'history support should match')
    })

    it('Confirm that contract state changes persist after proxy upgrade', async () => {
      const staker = accounts[3]
      const otherAccount = accounts[4]

      await approveAndStake(DEFAULT_AMOUNT, staker, staking)
      await mockStakingCaller.upgradeTo(stakingUpgraded.address, { from: proxyAdminAddress })

      staking = await StakingUpgraded.at(proxy.address)

      assert.isTrue(
        DEFAULT_AMOUNT.eq(await staking.totalStaked.call({ from: otherAccount })),
        'total staked amount should transfer after upgrade'
      )

      assert.isTrue(
        DEFAULT_AMOUNT.eq(await staking.totalStakedFor.call(staker, { from: otherAccount })),
        'total staked for staker should match after upgrade'
      )
    })
  })
})
