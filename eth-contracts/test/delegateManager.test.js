import * as _lib from '../utils/lib.js'
const { time } = require('@openzeppelin/test-helpers')

const AudiusAdminUpgradeabilityProxy = artifacts.require('AudiusAdminUpgradeabilityProxy')
const ServiceTypeManager = artifacts.require('ServiceTypeManager')
const ServiceProviderFactory = artifacts.require('ServiceProviderFactory')
const Staking = artifacts.require('Staking')
const DelegateManager = artifacts.require('DelegateManager')
const ClaimsManager = artifacts.require('ClaimsManager')

const stakingProxyKey = web3.utils.utf8ToHex('StakingProxy')
const serviceProviderFactoryKey = web3.utils.utf8ToHex('ServiceProviderFactory')
const serviceTypeManagerProxyKey = web3.utils.utf8ToHex('ServiceTypeManagerProxy')
const claimsManagerProxyKey = web3.utils.utf8ToHex('ClaimsManagerProxy')
const governanceKey = web3.utils.utf8ToHex('Governance')
const delegateManagerKey = web3.utils.utf8ToHex('DelegateManager')
const tokenRegKey = web3.utils.utf8ToHex('Token')

const testDiscProvType = web3.utils.utf8ToHex('discovery-provider')
const testEndpoint = 'https://localhost:5000'
const testEndpoint1 = 'https://localhost:5001'
const testEndpoint3 = 'https://localhost:5002'

const INITIAL_BAL = _lib.audToWeiBN(1000)
const DEFAULT_AMOUNT_VAL = _lib.audToWei(120)
const DEFAULT_AMOUNT = _lib.toBN(DEFAULT_AMOUNT_VAL)
const VOTING_PERIOD = 10
const VOTING_QUORUM = 1

const callValue0 = _lib.toBN(0)


contract('DelegateManager', async (accounts) => {
  let staking, stakingAddress, token, registry, governance, claimsManager0, claimsManagerProxy
  let serviceProviderFactory, claimsManager, delegateManager
  
  // intentionally not using acct0 to make sure no TX accidentally succeeds without specifying sender
  const [, proxyAdminAddress, proxyDeployerAddress] = accounts
  const tokenOwnerAddress = proxyDeployerAddress
  const guardianAddress = proxyDeployerAddress
  const stakerAccount = accounts[10]
  const stakerAccount2 = accounts[12]
  const delegatorAccount1 = accounts[11]
  const slasherAccount = stakerAccount

  beforeEach(async () => {
    registry = await _lib.deployRegistry(artifacts, proxyAdminAddress, proxyDeployerAddress)

    // Deploy + register Governance contract
    governance = await _lib.deployGovernance(
      artifacts,
      proxyAdminAddress,
      proxyDeployerAddress,
      registry,
      VOTING_PERIOD,
      VOTING_QUORUM,
      guardianAddress
    )
    await registry.addContract(governanceKey, governance.address, { from: proxyDeployerAddress })

    // Deploy + register token
    token = await _lib.deployToken(
      artifacts,
      proxyAdminAddress,
      proxyDeployerAddress,
      tokenOwnerAddress,
      governance.address
    )
    await registry.addContract(tokenRegKey, token.address, { from: proxyDeployerAddress })

    // Deploy + register Staking
    const staking0 = await Staking.new({ from: proxyDeployerAddress })
    const stakingInitializeData = _lib.encodeCall(
      'initialize',
      ['address', 'address'],
      [token.address, governance.address]
    )
    const stakingProxy = await AudiusAdminUpgradeabilityProxy.new(
      staking0.address,
      proxyAdminAddress,
      stakingInitializeData,
      governance.address,
      { from: proxyDeployerAddress }
    )
    staking = await Staking.at(stakingProxy.address)
    await registry.addContract(stakingProxyKey, stakingProxy.address, { from: proxyDeployerAddress })
    stakingAddress = staking.address

    // Deploy + register ServiceTypeManager
    let serviceTypeInitializeData = _lib.encodeCall(
      'initialize', ['address'], [governance.address]
    )
    let serviceTypeManager0 = await ServiceTypeManager.new({ from: proxyDeployerAddress })
    let serviceTypeManagerProxy = await AudiusAdminUpgradeabilityProxy.new(
      serviceTypeManager0.address,
      proxyAdminAddress,
      serviceTypeInitializeData,
      governance.address,
      { from: proxyDeployerAddress }
    )
    await registry.addContract(serviceTypeManagerProxyKey, serviceTypeManagerProxy.address, { from: proxyDeployerAddress })
    let serviceTypeManager = await ServiceTypeManager.at(serviceTypeManagerProxy.address)

    // Register discprov serviceType
    await _lib.addServiceType(testDiscProvType, _lib.audToWei(5), _lib.audToWei(10000000), governance, guardianAddress, serviceTypeManagerProxyKey, true)

    // Deploy ServiceProviderFactory
    let serviceProviderFactory0 = await ServiceProviderFactory.new({ from: proxyDeployerAddress })
    const serviceProviderFactoryCalldata = _lib.encodeCall(
      'initialize',
      ['address', 'address'],
      [registry.address, governance.address]
    )
    let serviceProviderFactoryProxy = await AudiusAdminUpgradeabilityProxy.new(
      serviceProviderFactory0.address,
      proxyAdminAddress,
      serviceProviderFactoryCalldata,
      governance.address,
      { from: proxyDeployerAddress }
    )
    serviceProviderFactory = await ServiceProviderFactory.at(serviceProviderFactoryProxy.address)
    await registry.addContract(serviceProviderFactoryKey, serviceProviderFactoryProxy.address, { from: proxyDeployerAddress })

    // Deploy new claimsManager proxy
    claimsManager0 = await ClaimsManager.new({ from: proxyDeployerAddress })
    const claimsInitializeCallData = _lib.encodeCall(
      'initialize',
      ['address', 'address'],
      [token.address, governance.address]
    )
    claimsManagerProxy = await AudiusAdminUpgradeabilityProxy.new(
      claimsManager0.address,
      proxyAdminAddress,
      claimsInitializeCallData,
      governance.address,
      { from: proxyDeployerAddress }
    )
    claimsManager = await ClaimsManager.at(claimsManagerProxy.address)

    // Register claimsManagerProxy
    await registry.addContract(
      claimsManagerProxyKey,
      claimsManagerProxy.address,
      { from: proxyDeployerAddress }
    )

    // Register new contract as a minter, from the same address that deployed the contract
    const addMinterTxR = await governance.guardianExecuteTransaction(
      tokenRegKey,
      callValue0,
      'addMinter(address)',
      _lib.abiEncode(['address'], [claimsManager.address]),
      { from: guardianAddress }
    )
    assert.equal(_lib.parseTx(addMinterTxR).event.args.success, true)

    const delegateManagerInitializeData = _lib.encodeCall(
      'initialize',
      ['address', 'address'],
      [token.address, governance.address]
    )
    let delegateManager0 = await DelegateManager.new({ from: proxyDeployerAddress })
    let delegateManagerProxy = await AudiusAdminUpgradeabilityProxy.new(
      delegateManager0.address,
      proxyAdminAddress,
      delegateManagerInitializeData,
      governance.address,
      { from: proxyDeployerAddress }
    )

    delegateManager = await DelegateManager.at(delegateManagerProxy.address)
    await registry.addContract(delegateManagerKey, delegateManagerProxy.address, { from: proxyDeployerAddress })

    // Clear min delegation amount for testing
    const updateMinDelAmountTxReceipt = await governance.guardianExecuteTransaction(
      delegateManagerKey,
      _lib.toBN(0),
      'updateMinDelegationAmount(uint256)',
      _lib.abiEncode(['uint256'], [0]),
      { from: guardianAddress }
    )
    assert.isTrue(_lib.parseTx(updateMinDelAmountTxReceipt).event.args.success, 'Expected tx to succeed')
    // ---- Configuring addresses
    await _lib.configureGovernanceStakingAddress(
      governance,
      governanceKey,
      guardianAddress,
      stakingProxy.address
    )
    // ---- Set up staking contract permissions
    await _lib.configureStakingContractAddresses(
      governance,
      guardianAddress,
      stakingProxyKey,
      staking,
      serviceProviderFactoryProxy.address,
      claimsManagerProxy.address,
      delegateManagerProxy.address
    )

    // ---- Set up claims manageer contract permissions
    await _lib.configureClaimsManagerContractAddresses(
      governance,
      guardianAddress,
      claimsManagerProxyKey,
      claimsManager,
      staking.address,
      serviceProviderFactory.address,
      delegateManager.address
    )

    // ---- Set up delegateManager  contract permissions
    await _lib.configureDelegateManagerAddresses(
      governance,
      guardianAddress,
      delegateManagerKey,
      delegateManager,
      staking.address,
      serviceProviderFactory.address,
      claimsManager.address
    )

    // ---- Set up spFactory  contract permissions
    await _lib.configureServiceProviderFactoryAddresses(
      governance,
      guardianAddress,
      serviceProviderFactoryKey,
      serviceProviderFactory,
      staking.address,
      serviceTypeManagerProxy.address,
      claimsManagerProxy.address,
      delegateManagerProxy.address
    )
  })

  /* Helper functions */

  const increaseRegisteredProviderStake = async (increase, account) => {
    // Approve token transfer
    await token.approve(
      stakingAddress,
      increase,
      { from: account })

    let tx = await serviceProviderFactory.increaseStake(
      increase,
      { from: account })

    let args = tx.logs.find(log => log.event === 'UpdatedStakeAmount').args
  }

  const decreaseRegisteredProviderStake = async (decrease, account) => {
    try {
      // Request decrease in stake
      await serviceProviderFactory.requestDecreaseStake(decrease, { from: account })
      let requestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(account)
      // Advance to valid block
      await time.advanceBlockTo(requestInfo.lockupExpiryBlock)
      // Approve token transfer from staking contract to account
      await serviceProviderFactory.decreaseStake({ from: account })
    } catch (e) {
      // Cancel request
      await serviceProviderFactory.cancelDecreaseStakeRequest(account, { from: account })
      throw e
    }
  }

  const getAccountStakeInfo = async (account, print = false) => {
    let spFactoryStake
    let totalInStakingContract

    let spDetails = await serviceProviderFactory.getServiceProviderDetails(account)
    spFactoryStake = spDetails.deployerStake
    totalInStakingContract = await staking.totalStakedFor(account)

    let delegatedStake = await delegateManager.getTotalDelegatedToServiceProvider(account)
    let lockedUpStake = await delegateManager.getTotalLockedDelegationForServiceProvider(account)
    let delegatorInfo = {}
    let delegators = await delegateManager.getDelegatorsList(account)
    for (var i = 0; i < delegators.length; i++) {
      let amountDelegated = await delegateManager.getTotalDelegatorStake(delegators[i])
      let amountDelegatedtoSP = await delegateManager.getDelegatorStakeForServiceProvider(delegators[i], account)
      let pendingUndelegateRequest = await delegateManager.getPendingUndelegateRequest(delegators[i])
      delegatorInfo[delegators[i]] = {
        amountDelegated,
        amountDelegatedtoSP,
        pendingUndelegateRequest
      }
    }
    let outsideStake = spFactoryStake.add(delegatedStake)
    let totalActiveStake = outsideStake.sub(lockedUpStake)
    let stakeDiscrepancy = totalInStakingContract.sub(outsideStake)
    let accountSummary = {
      totalInStakingContract,
      delegatedStake,
      spFactoryStake,
      delegatorInfo,
      outsideStake,
      lockedUpStake,
      totalActiveStake
    }

    if (print) {
      console.log(`${account} SpFactory: ${spFactoryStake}, DelegateManager: ${delegatedStake}`)
      console.log(`${account} Outside Stake: ${outsideStake} Staking: ${totalInStakingContract}`)
      console.log(`(Staking) vs (DelegateManager + SPFactory) Stake discrepancy: ${stakeDiscrepancy}`)
      console.dir(accountSummary, { depth: 5 })
    }

    return Object.assign(accountSummary, spDetails)
  }

  describe('Delegation tests', () => {
    let regTx

    beforeEach(async () => {
      // Transfer 1000 tokens to stakers
      await token.transfer(stakerAccount, INITIAL_BAL, { from: proxyDeployerAddress })
      await token.transfer(stakerAccount2, INITIAL_BAL, { from: proxyDeployerAddress })
      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      let initialBal = await token.balanceOf(stakerAccount)

      regTx = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint,
        DEFAULT_AMOUNT,
        stakerAccount
      )
      await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint1,
        DEFAULT_AMOUNT,
        stakerAccount2
      )

      // Confirm event has correct amount
      assert.isTrue(regTx.stakeAmount.eq(DEFAULT_AMOUNT))

      // Confirm balance updated for tokens
      let finalBal = await token.balanceOf(stakerAccount)
      assert.isTrue(initialBal.eq(finalBal.add(DEFAULT_AMOUNT)), 'Expect funds to be transferred')

      // Update SP Deployer Cut to 10%
      await serviceProviderFactory.updateServiceProviderCut(stakerAccount, 10, { from: stakerAccount })
      await serviceProviderFactory.updateServiceProviderCut(stakerAccount2, 10, { from: stakerAccount2 })
    })

    it('Initial state + claim', async () => {
      // Validate basic claim w/SP path
      let spStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake

      let totalStakedForAccount = await staking.totalStakedFor(stakerAccount)

      await claimsManager.initiateRound({ from: stakerAccount })

      totalStakedForAccount = await staking.totalStakedFor(stakerAccount)
      spStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake

      await delegateManager.claimRewards({ from: stakerAccount })

      totalStakedForAccount = await staking.totalStakedFor(stakerAccount)
      spStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      assert.isTrue(
        spStake.eq(totalStakedForAccount),
        'Stake value in SPFactory and Staking.sol must be equal')
    })

    it('Single delegator basic operations', async () => {
      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      let totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      let initialSpStake = totalStakedForSP
      let delegateAmount = _lib.audToWeiBN(60)

      let minDel = await delegateManager.getMinDelegationAmount()
      assert.isTrue(minDel.lte(delegateAmount), 'Must be above min delegation')

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        delegateAmount,
        { from: delegatorAccount1 })

      await delegateManager.delegateStake(
        stakerAccount,
        delegateAmount,
        { from: delegatorAccount1 })
      totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      let delegators = await delegateManager.getDelegatorsList(stakerAccount)
      let spStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      let delegatedStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)
      let delegatedStakeForSP = await delegateManager.getDelegatorStakeForServiceProvider(
        delegatorAccount1,
        stakerAccount)
      let delegatorFound = delegators.includes(delegatorAccount1)

      assert.isTrue(
        delegatorFound,
        'Delegator found in array'
      )
      assert.isTrue(
        delegatedStake.eq(delegatedStakeForSP),
        'All stake expected for Service Provider'
      )
      assert.isTrue(
        totalStakedForSP.eq(spStake.add(delegatedStake)),
        'Sum of Staking.sol equals SPFactory and DelegateManager'
      )

      // Increase delegated stake
      let increaseAmount = _lib.audToWeiBN(5)
      await token.approve(
        stakingAddress,
        increaseAmount,
        { from: delegatorAccount1 })
      await delegateManager.delegateStake(
        stakerAccount,
        increaseAmount,
        { from: delegatorAccount1 })
      assert.isTrue(
        (await delegateManager.getTotalDelegatorStake(delegatorAccount1)).eq(delegatedStake.add(increaseAmount)),
        'Confirm increase')

      delegatedStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)

      // Submit request to undelegate all stake
      await delegateManager.requestUndelegateStake(
        stakerAccount,
        delegatedStake,
        { from: delegatorAccount1 }
      )

      // Confirm lockup amount is registered
      let undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)
      assert.isTrue(
        undelegateRequestInfo.amount.eq(delegatedStake),
        'Expected amount not found in lockup')

      let totalLockedDelegation =
        await delegateManager.getTotalLockedDelegationForServiceProvider(stakerAccount)
      assert.isTrue(
        totalLockedDelegation.eq(delegatedStake),
        'Expected amount not found in total lockup for SP')

      // Try to undelegate stake immediately, confirm failure
      await _lib.assertRevert(
        delegateManager.undelegateStake({ from: delegatorAccount1 }),
        'Lockup must be expired'
      )
      // Try to submit another request, expect revert
      await _lib.assertRevert(
        delegateManager.requestUndelegateStake(
          stakerAccount,
          delegatedStake,
          { from: delegatorAccount1 }),
        'No pending lockup expected'
      )

      // Advance to valid block
      await time.advanceBlockTo(undelegateRequestInfo.lockupExpiryBlock)

      // Undelegate stake
      delegateManager.undelegateStake({ from: delegatorAccount1 })

      // Confirm all state change operations have occurred
      undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)

      totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      delegators = await delegateManager.getDelegatorsList(stakerAccount)
      delegatedStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)
      totalLockedDelegation =
        await delegateManager.getTotalLockedDelegationForServiceProvider(stakerAccount)
      assert.equal(delegators.length, 0, 'Expect no remaining delegators')
      assert.equal(delegatedStake, 0, 'Expect no remaining total delegate stake')
      assert.equal(totalLockedDelegation, 0, 'Expect no remaining locked stake for SP')
      assert.isTrue(initialSpStake.eq(totalStakedForSP), 'Staking.sol back to initial value')
    })

    it('Single delegator + claim', async () => {
      // TODO: Validate all
      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      let totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      let initialDelegateAmount = _lib.audToWeiBN(60)

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      let tx = await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      let delegatedStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)
      let deployerCut = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerCut
      let deployerCutBase = await serviceProviderFactory.getServiceProviderDeployerCutBase()

      // Initiate round
      await claimsManager.initiateRound({ from: stakerAccount })

      // Confirm claim is pending
      let pendingClaim = await claimsManager.claimPending(stakerAccount)
      assert.isTrue(pendingClaim, 'ClaimsManager expected to consider claim pending')

      let spStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      let totalStake = await staking.totalStaked()
      totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      delegatedStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)
      let totalValueOutsideStaking = spStake.add(delegatedStake)
      let fundingAmount = await claimsManager.getFundsPerRound()
      let totalRewards = (totalStakedForSP.mul(fundingAmount)).div(totalStake)

      // Manually calculate expected value prior to making claim
      // Identical math as contract
      let delegateRewardsPriorToSPCut = (delegatedStake.mul(totalRewards)).div(totalValueOutsideStaking)
      let spDeployerCut = (delegateRewardsPriorToSPCut.mul(deployerCut)).div(deployerCutBase)
      let delegateRewards = delegateRewardsPriorToSPCut.sub(spDeployerCut)
      let expectedDelegateStake = delegatedStake.add(delegateRewards)
      let spRewardShare = (spStake.mul(totalRewards)).div(totalValueOutsideStaking)
      let expectedSpStake = spStake.add(spRewardShare.add(spDeployerCut))

      await delegateManager.claimRewards({ from: stakerAccount })

      let finalSpStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      let finalDelegateStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)

      assert.isTrue(finalSpStake.eq(expectedSpStake), 'Expected SP stake matches found value')
      assert.isTrue(finalDelegateStake.eq(expectedDelegateStake), 'Expected delegate stake matches found value')
    })

    it('Undelegate after SP has deregistered', async () => {
      let initialDelegateAmount = _lib.audToWeiBN(60)
      // Approve staking transfer
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      let accountInfo = await getAccountStakeInfo(stakerAccount, false)
      assert.isTrue(
        accountInfo.delegatorInfo[delegatorAccount1].amountDelegated.eq(initialDelegateAmount),
        'Expect initial delegate amount reflected')

      // Request decrease all of stake by deregistering SP
      await _lib.deregisterServiceProvider(
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint,
        stakerAccount)
      let deregisterRequestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
      await time.advanceBlockTo(deregisterRequestInfo.lockupExpiryBlock)

      // Withdraw all SP stake
      await serviceProviderFactory.decreaseStake({ from: stakerAccount })

      // Submit request to undelegate all stake
      await delegateManager.requestUndelegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 }
      )

      // Confirm lockup amount is registered
      let undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)
      await time.advanceBlockTo(undelegateRequestInfo.lockupExpiryBlock)
      // Finalize undelegation, confirm operation is allowed
      await delegateManager.undelegateStake({ from: delegatorAccount1 })
      let finalDelegateStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)
      assert.isTrue(finalDelegateStake.eq(_lib.toBN(0)), 'No remaining stake expected')
    })

    it('Register 3rd service provider after round has completed', async () => {
      let stakerAccount3 = accounts[8]
      // Transfer 1000 tokens to delegator
      await token.transfer(stakerAccount3, INITIAL_BAL, { from: proxyDeployerAddress })
      // Fund new claim
      await claimsManager.initiateRound({ from: stakerAccount })
      // Get rewards
      await delegateManager.claimRewards({ from: stakerAccount })
      await delegateManager.claimRewards({ from: stakerAccount2 })
      let fundBlock = await claimsManager.getLastFundBlock()
      let blockDiff = await claimsManager.getFundingRoundBlockDiff()
      let roundEndBlock = fundBlock.add(blockDiff)
      await time.advanceBlockTo(roundEndBlock)
      // Confirm a new SP can be registered
      await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint3,
        DEFAULT_AMOUNT,
        stakerAccount3)
      let info = await getAccountStakeInfo(stakerAccount3, false)
      assert.isTrue((info.totalInStakingContract).eq(DEFAULT_AMOUNT), 'Expect stake')
      assert.isTrue((info.spFactoryStake).eq(DEFAULT_AMOUNT), 'Expect sp factory stake')
    })

    it('Single delegator + claim + slash', async () => {
      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      let initialDelegateAmount = _lib.audToWeiBN(60)

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Fund new claim
      await claimsManager.initiateRound({ from: stakerAccount })

      // Get rewards
      await delegateManager.claimRewards({ from: stakerAccount })
      await delegateManager.claimRewards({ from: stakerAccount2 })

      // Slash 30% of total
      const totalInStakingContract = await staking.totalStakedFor(slasherAccount)
      const slashAmountVal = _lib.audToWei((_lib.fromWei(totalInStakingContract)) * 30 / 100)
      const slashAmount = _lib.toBN(slashAmountVal)

      // Perform slash functions
      await _lib.slash(slashAmountVal, slasherAccount, governance, delegateManagerKey, guardianAddress, true)

      // Summarize after execution
      let spFactoryStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      let totalInStakingAfterSlash = await staking.totalStakedFor(stakerAccount)
      let delegatedStake = await delegateManager.getTotalDelegatorStake(delegatorAccount1)
      let outsideStake = spFactoryStake.add(delegatedStake)
      let stakeDiscrepancy = totalInStakingAfterSlash.sub(outsideStake)
      let totalStaked = await staking.totalStaked()
      let tokensAtStakingAddress = await token.balanceOf(stakingAddress)

      assert.equal(stakeDiscrepancy, 0, 'Equal tokens expected inside/outside Staking')
      assert.isTrue(totalStaked.eq(tokensAtStakingAddress), 'Expect equivalency between Staking contract and ERC')
      assert.isTrue(totalInStakingAfterSlash.eq(outsideStake), 'Expected SP/delegatemanager to equal staking')
      assert.isTrue((totalInStakingContract.sub(slashAmount)).eq(totalInStakingAfterSlash), 'Expected slash value')
    })

    it('Slash restrictions', async () => {
      // Deregister endpoint, removing all stake
      await _lib.deregisterServiceProvider(
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint,
        stakerAccount)
      // Query the resulting deregister operation
      let requestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
      // Advance to valid block
      await time.advanceBlockTo(requestInfo.lockupExpiryBlock)
      // Finalize withdrawal
      await serviceProviderFactory.decreaseStake({ from: stakerAccount })

      /** Perform slash functions */

      // Fail to slash more than currently staked
      await _lib.slash(DEFAULT_AMOUNT_VAL, slasherAccount, governance, delegateManagerKey, guardianAddress, false)

      // Fail to slash more than currently staked
      await _lib.slash(DEFAULT_AMOUNT_VAL + 4, stakerAccount2, governance, delegateManagerKey, guardianAddress, false)

      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      // Delegate equal stake to stakerAccount2
      // Approve staking transfer
      await token.approve(stakingAddress, DEFAULT_AMOUNT, { from: delegatorAccount1 })

      await delegateManager.delegateStake(
        stakerAccount2,
        DEFAULT_AMOUNT,
        { from: delegatorAccount1 })

      // Deregister endpoint, removing all direct stake
      await _lib.deregisterServiceProvider(
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint1,
        stakerAccount2)

      // Query the resulting deregister operation
      requestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount2)
      // Advance to valid block
      await time.advanceBlockTo(requestInfo.lockupExpiryBlock)
      // Finalize withdrawal
      await serviceProviderFactory.decreaseStake({ from: stakerAccount2 })

      // Fail to slash account with zero stake
      await _lib.slash(DEFAULT_AMOUNT_VAL, stakerAccount2, governance, delegateManagerKey, guardianAddress, false)
    })

    // TODO: Revisit below test case and remove unneeded validation if necessary
    // Test case still in progress
    it.skip('TODO WIP - claim restriction on staking balance', async () => {
      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      let initialDelegateAmount = _lib.audToWeiBN(60)

      // Fund new claim
      await claimsManager.initiateRound({ from: stakerAccount })
      let fundBlock = await claimsManager.getLastFundBlock()
      let stakedAtFundBlock = await staking.totalStakedForAt(stakerAccount, fundBlock)
      console.log(stakedAtFundBlock)
      console.log('deregstering')

      // Deregister endpoint, removing all stake
      await _lib.deregisterServiceProvider(
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint,
        stakerAccount,
        { from: stakerAccount })

      console.log('deregistered')
      let spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      console.log(spDetails)
      assert.isTrue(
        stakedAtFundBlock.lte(spDetails.maxAccountStake),
        'Must be less than account max')
      // This calls fails maximum bounds check since the max is now zero with no registered endpoint
      await delegateManager.claimRewards({ from: stakerAccount })
    })

    it('40 delegators to one SP + claim', async () => {
      let totalStakedForSP = await staking.totalStakedFor(stakerAccount)

      let numDelegators = 40
      if (accounts.length < numDelegators) {
        // Disabled for CI, pending modification of total accounts
        console.log(`Insufficient accounts found - required ${numDelegators}, found ${accounts.length}`)
        return
      }

      let delegateAccountOffset = 4
      let delegatorAccounts = accounts.slice(delegateAccountOffset, delegateAccountOffset + numDelegators)
      let totalDelegationAmount = DEFAULT_AMOUNT
      let singleDelegateAmount = totalDelegationAmount.div(web3.utils.toBN(numDelegators))

      for (var delegator of delegatorAccounts) {
        // Transfer 1000 tokens to each delegator
        await token.transfer(delegator, INITIAL_BAL, { from: proxyDeployerAddress })
        // Approve staking transfer
        await token.approve(
          stakingAddress,
          singleDelegateAmount,
          { from: delegator })

        await delegateManager.delegateStake(
          stakerAccount,
          singleDelegateAmount,
          { from: delegator })

        let delegatorStake = await delegateManager.getTotalDelegatorStake(delegator)  
        let delegatorStakeForSP = await delegateManager.getDelegatorStakeForServiceProvider(
          delegator,
          stakerAccount)
        assert.isTrue(
          delegatorStake.eq(singleDelegateAmount),
          'Expected total delegator stake to match input')
        assert.isTrue(
          delegatorStakeForSP.eq(singleDelegateAmount),
          'Expected total delegator stake to SP to match input')
      }

      let totalSPStakeAfterDelegation = await staking.totalStakedFor(stakerAccount)
      let expectedTotalStakeAfterDelegation = totalStakedForSP.add(totalDelegationAmount)
      assert.isTrue(
        totalSPStakeAfterDelegation.eq(expectedTotalStakeAfterDelegation),
        `Total value inconsistent after all delegation. Expected ${expectedTotalStakeAfterDelegation}, found ${totalSPStakeAfterDelegation}`)

      // Initiate round
      await claimsManager.initiateRound({ from: stakerAccount })

      let deployerCut = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerCut
      let deployerCutBase = await serviceProviderFactory.getServiceProviderDeployerCutBase()

      // Calculating expected values
      let spStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      let totalStake = await staking.totalStaked()
      totalStakedForSP = await staking.totalStakedFor(stakerAccount)
      let totalDelegatedStake = web3.utils.toBN(0)
      for (let delegator of delegatorAccounts) {
        let delegatorStake = await delegateManager.getTotalDelegatorStake(delegator)
        totalDelegatedStake = totalDelegatedStake.add(delegatorStake)
      }

      let totalValueOutsideStaking = spStake.add(totalDelegatedStake)
      assert.isTrue(
        totalStakedForSP.eq(totalValueOutsideStaking),
        'Expect equivalent value between staking contract and protocol contracts')

      let fundingAmount = await claimsManager.getFundsPerRound()
      let totalRewards = (totalStakedForSP.mul(fundingAmount)).div(totalStake)

      let spDelegationRewards = web3.utils.toBN(0)
      // Expected value for each delegator
      let expectedDelegateStakeDictionary = {}
      for (let delegator of delegatorAccounts) {
        let delegatorStake = await delegateManager.getTotalDelegatorStake(delegator)
        let delegateRewardsPriorToSPCut = (delegatorStake.mul(totalRewards)).div(totalValueOutsideStaking)
        let spDeployerCut = (delegateRewardsPriorToSPCut.mul(deployerCut)).div(deployerCutBase)
        let delegateRewards = delegateRewardsPriorToSPCut.sub(spDeployerCut)
        // Update dictionary of expected values
        let expectedDelegateStake = delegatorStake.add(delegateRewards)
        expectedDelegateStakeDictionary[delegator] = expectedDelegateStake
        spDelegationRewards = spDelegationRewards.add(spDeployerCut)
      }

      // Expected value for SP
      let spRewardShare = (spStake.mul(totalRewards)).div(totalValueOutsideStaking)
      let expectedSpStake = spStake.add(spRewardShare.add(spDelegationRewards))

      // Perform claim
      let claimTx = await delegateManager.claimRewards({ from: stakerAccount })
      // console.dir(claimTx, { depth: 5 })
      totalStakedForSP = await staking.totalStakedFor(stakerAccount)

      // Validate final SP value vs expected
      let finalSpStake = (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).deployerStake
      assert.isTrue(finalSpStake.eq(expectedSpStake), 'Expected SP stake matches found value')
      // Validate each delegate value against expected
      for (let delegator of delegatorAccounts) {
        let finalDelegatorStake = await delegateManager.getTotalDelegatorStake(delegator)
        let expectedDelegatorStake = expectedDelegateStakeDictionary[delegator]
        assert.isTrue(
          finalDelegatorStake.eq(expectedDelegatorStake),
          'Unexpected delegator stake after claim is made')
      }
    })

    // Confirm a pending undelegate operation negates any claimed value
    it('Single delegator + undelegate + claim', async () => {
      // TODO: Validate all
      // Transfer 1000 tokens to delegator
      await token.transfer(delegatorAccount1, INITIAL_BAL, { from: proxyDeployerAddress })

      let initialDelegateAmount = _lib.audToWeiBN(60)

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Submit request to undelegate
      await delegateManager.requestUndelegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 }
      )

      let preRewardInfo = await getAccountStakeInfo(stakerAccount, false)

      // Initiate round
      await claimsManager.initiateRound({ from: stakerAccount })
      await delegateManager.claimRewards({ from: stakerAccount })
      let postRewardInfo = await getAccountStakeInfo(stakerAccount, false)

      let preRewardDelegation = preRewardInfo.delegatorInfo[delegatorAccount1].amountDelegated
      let postRewardDelegation = postRewardInfo.delegatorInfo[delegatorAccount1].amountDelegated
      assert.isTrue(
        preRewardDelegation.eq(postRewardDelegation),
        'Confirm no reward issued to delegator')
      let preRewardStake = preRewardInfo.totalInStakingContract
      let postRewardStake = postRewardInfo.totalInStakingContract
      assert.isTrue(
        postRewardStake.gt(preRewardStake),
        'Confirm reward issued to service provider')
    })

    // Confirm a pending undelegate operation is negated by a slash to the account
    it('Single delegator + undelegate + slash', async () => {
      let initialDelegateAmount = _lib.audToWeiBN(60)
      let slashAmountVal = _lib.audToWei(100)
      let slashAmount = _lib.toBN(slashAmountVal)

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Submit request to undelegate
      await delegateManager.requestUndelegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 }
      )

      let preSlashInfo = await getAccountStakeInfo(stakerAccount, false)
      let preSlashLockupStake = preSlashInfo.lockedUpStake
      assert.isTrue(
        preSlashLockupStake.eq(initialDelegateAmount),
        'Initial delegate amount not found')

      // Perform slash functions
      await _lib.slash(slashAmountVal, slasherAccount, governance, delegateManagerKey, guardianAddress, true)

      let postRewardInfo = await getAccountStakeInfo(stakerAccount, false)

      let postSlashLockupStake = postRewardInfo.lockedUpStake
      assert.equal(
        postSlashLockupStake,
        0,
        'Expect no lockup funds to carry over')
    })

    it('Single delegator to invalid SP', async () => {
      let initialDelegateAmount = _lib.audToWeiBN(60)

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Confirm maximum bounds exceeded for SP w/zero endpoints
      await _lib.assertRevert(
        delegateManager.delegateStake(
          accounts[8],
          initialDelegateAmount,
          { from: delegatorAccount1 }),
        'Maximum stake amount exceeded'
      )
    })

    it('Validate undelegate request restrictions', async () => {
      await _lib.assertRevert(
        delegateManager.cancelUndelegateStake({ from: delegatorAccount1 }),
        'Pending lockup expected')
      await _lib.assertRevert(
        delegateManager.undelegateStake({ from: delegatorAccount1 }),
        'Pending lockup expected')
      await _lib.assertRevert(
        delegateManager.requestUndelegateStake(stakerAccount, 10, { from: delegatorAccount1 }),
        'Delegator must be staked for SP')

      let initialDelegateAmount = _lib.audToWeiBN(60)
      // Approve staking transfer for delegator 1
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Stake initial value for delegator 1
      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Try and undelegate more than available
      await _lib.assertRevert(
        delegateManager.requestUndelegateStake(
          stakerAccount,
          initialDelegateAmount.add(_lib.toBN(10)), { from: delegatorAccount1 }),
        'Cannot decrease greater than currently staked for this ServiceProvider'
      )
    })

    it('3 delegators + pending claim + undelegate restrictions', async () => {
      const delegatorAccount2 = accounts[5]
      const delegatorAccount3 = accounts[6]
      // Transfer 1000 tokens to delegator2, delegator3
      await token.transfer(delegatorAccount2, INITIAL_BAL, { from: proxyDeployerAddress })
      await token.transfer(delegatorAccount3, INITIAL_BAL, { from: proxyDeployerAddress })
      let initialDelegateAmount = _lib.audToWeiBN(60)

      // Approve staking transfer for delegator 1
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Stake initial value for delegator 1
      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 })

      // Submit request to undelegate
      await delegateManager.requestUndelegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount1 }
      )

      // Approve staking transfer for delegator 3
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount3 })

      // Stake initial value for delegator 3
      await delegateManager.delegateStake(
        stakerAccount,
        initialDelegateAmount,
        { from: delegatorAccount3 })

      // Confirm lockup amount is registered
      let undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)
      assert.isTrue(
        undelegateRequestInfo.amount.eq(initialDelegateAmount),
        'Expect request to match undelegate amount')

      // Advance to valid block
      await time.advanceBlockTo(undelegateRequestInfo.lockupExpiryBlock)
      let currentBlock = await web3.eth.getBlock('latest')
      let currentBlockNum = currentBlock.number
      assert.isTrue(
        (web3.utils.toBN(currentBlockNum)).gte(undelegateRequestInfo.lockupExpiryBlock),
        'Confirm expired lockup period')

      // Initiate round
      await claimsManager.initiateRound({ from: stakerAccount })

      // Confirm claim is pending
      let pendingClaim = await claimsManager.claimPending(stakerAccount)
      assert.isTrue(pendingClaim, 'ClaimsManager expected to consider claim pending')

      // Attempt to finalize undelegate stake request
      await _lib.assertRevert(
        delegateManager.undelegateStake({ from: delegatorAccount1 }),
        'Undelegate not permitted for SP pending claim'
      )

      // Approve staking transfer for delegator 2
      await token.approve(
        stakingAddress,
        initialDelegateAmount,
        { from: delegatorAccount2 })

      // Attempt to delegate
      await _lib.assertRevert(
        delegateManager.delegateStake(
          stakerAccount,
          initialDelegateAmount,
          { from: delegatorAccount2 }),
        'Delegation not permitted for SP pending claim'
      )

      // Submit request to undelegate for delegator 3
      await _lib.assertRevert(
        delegateManager.requestUndelegateStake(
          stakerAccount,
          initialDelegateAmount,
          { from: delegatorAccount3 }),
        'Undelegate request not permitted for SP'
      )

      await delegateManager.claimRewards({ from: stakerAccount })
    })

    it('Slash below sp bounds', async () => {
      let preSlashInfo = await getAccountStakeInfo(stakerAccount, false)
      // Set slash amount to all but 1 AUD for this SP
      let diffAmount = _lib.audToWeiBN(1)
      let slashAmount = (preSlashInfo.spFactoryStake).sub(diffAmount)

      // Perform slash functions
      await _lib.slash(_lib.audToWei(_lib.fromWei(slashAmount)), slasherAccount, governance, delegateManagerKey, guardianAddress, true)

      let spDetails = await getAccountStakeInfo(stakerAccount, false)
      assert.isFalse(
        spDetails.validBounds,
        'Bound violation expected')

      // Initiate round
      await claimsManager.initiateRound({ from: stakerAccount })

      await _lib.assertRevert(
        increaseRegisteredProviderStake(
          diffAmount,
          stakerAccount),
        'No claim expected to be pending prior to stake transfer')

      // Confirm claim is pending
      let pendingClaim = await claimsManager.claimPending(stakerAccount)
      assert.isTrue(pendingClaim, 'ClaimsManager expected to consider claim pending')

      // Claim reward even though we are below bounds
      await delegateManager.claimRewards({ from: stakerAccount })

      let spDetailsAfterClaim = await getAccountStakeInfo(stakerAccount, false)
      assert.isTrue(
        (spDetails.totalInStakingContract).eq(spDetailsAfterClaim.totalInStakingContract),
        'Expect NO reward since bounds were violated')

      // Confirm claim is considered NOT pending even though nothing was claimed
      assert.isFalse(
        await claimsManager.claimPending(stakerAccount),
        'ClaimsManager expected to consider claim pending')

      // Confirm bounds are still violated after rewards
      assert.isFalse(
        (await serviceProviderFactory.getServiceProviderDetails(stakerAccount)).validBounds,
        'Bound violation expected')

      // Try to increase by diffAmount, but expect rejection since lower bound is unmet
      await _lib.assertRevert(
        increaseRegisteredProviderStake(
          diffAmount,
          stakerAccount),
        'Minimum stake requirement not met')

      // Increase to minimum
      spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      let info = await getAccountStakeInfo(stakerAccount, false)
      let increase = (spDetails.minAccountStake).sub(info.spFactoryStake)
      // Increase to minimum bound
      await increaseRegisteredProviderStake(
        increase,
        stakerAccount)
      // Validate increase
      spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      assert.isTrue(
        spDetails.validBounds,
        'Valid bound expected')
    })

    it('Delegator increase/decrease + SP direct stake bound validation', async () => {
      let spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      let delegateAmount = spDetails.minAccountStake
      let info = await getAccountStakeInfo(stakerAccount, false)
      let failedIncreaseAmount = spDetails.maxAccountStake
      // Transfer sufficient funds
      await token.transfer(delegatorAccount1, failedIncreaseAmount, { from: proxyDeployerAddress })
      // Approve staking transfer
      await token.approve(stakingAddress, failedIncreaseAmount, { from: delegatorAccount1 })
      await _lib.assertRevert(
        delegateManager.delegateStake(
          stakerAccount,
          failedIncreaseAmount,
          { from: delegatorAccount1 }),
        'Maximum stake amount exceeded'
      )
      let infoAfterFailure = await getAccountStakeInfo(stakerAccount, false)
      assert.isTrue(
        (info.delegatedStake).eq(infoAfterFailure.delegatedStake),
        'No increase in delegated stake expected')

      // Delegate min stake amount
      await token.approve(
        stakingAddress,
        delegateAmount,
        { from: delegatorAccount1 })
      await delegateManager.delegateStake(
        stakerAccount,
        delegateAmount,
        { from: delegatorAccount1 })

      // Remove deployer direct stake
      // Decrease by all but 1 AUD direct stake
      let spFactoryStake = infoAfterFailure.spFactoryStake
      let diff = _lib.audToWeiBN(1)
      // Confirm failure as direct stake threshold is violated
      // Due to the total delegated stake equal to min bounds, total account stake balance will NOT violate bounds
      await _lib.assertRevert(
        decreaseRegisteredProviderStake(spFactoryStake.sub(diff), stakerAccount),
        'Direct stake restriction violated for this service provider'
      )

      // Decrease to min
      let spInfo = await getAccountStakeInfo(stakerAccount, false)
      let minDirectStake = await serviceProviderFactory.getMinDeployerStake()
      let diffToMin = (spInfo.spFactoryStake).sub(minDirectStake)
      await decreaseRegisteredProviderStake(diffToMin, stakerAccount)
      let infoAfterDecrease = await getAccountStakeInfo(stakerAccount, false)
      assert.isTrue(
        (infoAfterDecrease.spFactoryStake).eq(minDirectStake),
        'Expect min direct stake while within total account bounds')

      // At this point we have a total stake of 2x the minimum for this SP
      // 1x Min directly from SP
      // 1x Min from our single delegator
      // So - a service provider should be able to register with NO additional stake and still be within bounds
      await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint3,
        _lib.audToWeiBN(0),
        stakerAccount)

      let infoAfterSecondEndpoint = await getAccountStakeInfo(stakerAccount, false)
      assert.isTrue(
        (infoAfterSecondEndpoint.totalInStakingContract).eq(infoAfterDecrease.totalInStakingContract),
        'Expect static total stake after new SP endpoint'
      )

      // Now, initiate a request to undelegate for this SP
      await delegateManager.requestUndelegateStake(
        stakerAccount,
        delegateAmount,
        { from: delegatorAccount1 }
      )
      // Confirm lockup amount is registered
      let undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)
      assert.isTrue(
        undelegateRequestInfo.amount.eq(delegateAmount),
        'Expect request to match undelegate amount')

      // Advance to valid block
      await time.advanceBlockTo(undelegateRequestInfo.lockupExpiryBlock)
      let currentBlock = await web3.eth.getBlock('latest')
      let currentBlockNum = currentBlock.number
      assert.isTrue(
        (web3.utils.toBN(currentBlockNum)).gte(undelegateRequestInfo.lockupExpiryBlock),
        'Confirm expired lockup period')
      // Try to execute undelegate stake, but fail due to min bound violation
      await _lib.assertRevert(
        delegateManager.undelegateStake({ from: delegatorAccount1 }),
        'Minimum stake requirement not met')
    })

    it('Undelegate lockup duration changes', async () => {
      let currentDuration = await delegateManager.getUndelegateLockupDuration()
      const newDurationVal = _lib.fromBN(currentDuration) * 2
      const newDuration = _lib.toBN(newDurationVal)

      await _lib.assertRevert(
        delegateManager.updateUndelegateLockupDuration(newDuration),
        "Only callable by Governance contract"
      )

      const txReceipt = await governance.guardianExecuteTransaction(
        delegateManagerKey,
        _lib.toBN(0),
        'updateUndelegateLockupDuration(uint256)',
        _lib.abiEncode(['uint256'], [newDurationVal]),
        { from: guardianAddress }
      )
      assert.isTrue(_lib.parseTx(txReceipt).event.args.success, 'Expected tx to succeed')

      currentDuration = await delegateManager.getUndelegateLockupDuration()
      assert.isTrue(currentDuration.eq(newDuration))
    })

    it('Maximum delegators', async () => {
      // Update max delegators to 4
      const maxDelegators = 4
      const tx = await governance.guardianExecuteTransaction(
        delegateManagerKey,
        _lib.toBN(0),
        'updateMaxDelegators(uint256)',
        _lib.abiEncode(['uint256'], [maxDelegators]),
        { from: guardianAddress }
      )
      assert.isTrue(_lib.parseTx(tx).event.args.success, 'Expected tx to succeed')

      assert.equal(
        _lib.fromBN(await delegateManager.getMaxDelegators()),
        maxDelegators,
        'Max delegators not updated'
      )
      let delegateAccountOffset = 4
      let delegatorAccounts = accounts.slice(delegateAccountOffset, delegateAccountOffset + (maxDelegators + 1))
      let singleDelegateAmount = _lib.audToWeiBN(10)
      for (var i = 0; i < delegatorAccounts.length; i++) {
        let delegator = delegatorAccounts[i]
        // Transfer 1000 tokens to each delegator
        await token.transfer(delegator, singleDelegateAmount, { from: proxyDeployerAddress })
        // Approve staking transfer
        await token.approve(stakingAddress, singleDelegateAmount, { from: delegator })
        if (i === (delegatorAccounts.length - 1)) {
          await _lib.assertRevert(
            delegateManager.delegateStake(
              stakerAccount,
              singleDelegateAmount,
              { from: delegator }),
            'Maximum delegators exceeded'
          )
        } else {
          await delegateManager.delegateStake(
            stakerAccount,
            singleDelegateAmount,
            { from: delegator })
        }
      }
    })

    it('Min delegate stake', async () => {
      // Update min delegation level configuration
      let minDelegateStakeVal = _lib.audToWei(100)
      let minDelegateStake = _lib.toBN(minDelegateStakeVal)
      
      const updateMinDelTxReceipt = await governance.guardianExecuteTransaction(
        delegateManagerKey,
        _lib.toBN(0),
        'updateMinDelegationAmount(uint256)',
        _lib.abiEncode(['uint256'], [minDelegateStakeVal]),
        { from: guardianAddress }
      )
      assert.isTrue(_lib.parseTx(updateMinDelTxReceipt).event.args.success, 'Expected tx to succeed')

      assert.isTrue(
        minDelegateStake.eq(await delegateManager.getMinDelegationAmount()),
        'Min delegation not updated')

      // Approve staking transfer
      await token.approve(
        stakingAddress,
        minDelegateStake,
        { from: delegatorAccount1 })

      // Confirm failure below minimum
      await _lib.assertRevert(
        delegateManager.delegateStake(
          stakerAccount,
          minDelegateStake.sub(_lib.audToWeiBN(10)),
          { from: delegatorAccount1 }),
        'Minimum delegation amount')

      // Delegate min
      await delegateManager.delegateStake(
        stakerAccount,
        minDelegateStake,
        { from: delegatorAccount1 })

      // Submit request to undelegate stake that will fail as total amount results in < min amount
      let failUndelegateAmount = minDelegateStake.sub(_lib.audToWeiBN(30))
      await delegateManager.requestUndelegateStake(stakerAccount, failUndelegateAmount, { from: delegatorAccount1 })
      let undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)
      await time.advanceBlockTo(undelegateRequestInfo.lockupExpiryBlock)
      await _lib.assertRevert(
        delegateManager.undelegateStake({ from: delegatorAccount1 }),
        'Minimum delegation amount'
      )
      // Cancel request
      await delegateManager.cancelUndelegateStake({ from: delegatorAccount1 })

      // Undelegate all stake and confirm min delegation amount does not prevent withdrawal
      await delegateManager.requestUndelegateStake(stakerAccount, minDelegateStake, { from: delegatorAccount1 })
      undelegateRequestInfo = await delegateManager.getPendingUndelegateRequest(delegatorAccount1)
      await time.advanceBlockTo(undelegateRequestInfo.lockupExpiryBlock)

      // Finalize undelegation, confirm operation is allowed
      await delegateManager.undelegateStake({ from: delegatorAccount1 })
      assert.equal(_lib.fromBN(await delegateManager.getTotalDelegatorStake(delegatorAccount1)), 0, 'No stake expected')
      assert.equal((await delegateManager.getDelegatorsList(stakerAccount)).length, 0, 'No delegators expected')
    })

    it('Caller restriction verification', async () => {
      await _lib.assertRevert(
        delegateManager.updateMaxDelegators(10, { from: accounts[3] }),
        "Only callable by Governance contract"
      )
      await _lib.assertRevert(
        delegateManager.updateMinDelegationAmount(10, { from: accounts[3] }),
        "Only callable by Governance contract"
      )
      await _lib.assertRevert(
        delegateManager.slash(10, slasherAccount),
        "Only callable by Governance contract"
      )
    })

    describe('Service provider decrease stake behavior', async () => {
      it('claimReward disabled if no active stake for SP', async () => {
        // Request decrease all of stake
        await _lib.deregisterServiceProvider(
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint,
          stakerAccount)
        // Initiate round
        await claimsManager.initiateRound({ from: stakerAccount })
        let acctInfo = await getAccountStakeInfo(stakerAccount)
        let spStake = acctInfo.spFactoryStake
        assert.isTrue(spStake.gt(_lib.toBN(0)), 'Expect non-zero stake')
        // Transaction will fail since maximum stake for the account is now zero after the deregister
        await _lib.assertRevert(
          delegateManager.claimRewards({ from: stakerAccount }),
          'Service Provider stake required'
        )

        let deregisterRequestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
        await time.advanceBlockTo(deregisterRequestInfo.lockupExpiryBlock)
        // Withdraw all stake
        await serviceProviderFactory.decreaseStake({ from: stakerAccount })
        // Attempt to re-register endpoint
        // Confirm re-registration is allowed
        await _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint,
          DEFAULT_AMOUNT,
          stakerAccount
        )
        acctInfo = await getAccountStakeInfo(stakerAccount)
        assert.isTrue(acctInfo.totalInStakingContract.eq(DEFAULT_AMOUNT), 'Expect default in staking')
        assert.isTrue(acctInfo.spFactoryStake.eq(DEFAULT_AMOUNT), 'Expect default in sp factory')
      })

      it('Re-registration after removing all stake and claim', async () => {
        // Initiate round
        await claimsManager.initiateRound({ from: stakerAccount })
        // Claim reward immediately
        await delegateManager.claimRewards({ from: stakerAccount })
        // Request decrease all of stake
        await _lib.deregisterServiceProvider(
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint,
          stakerAccount)
        let deregisterRequestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
        await time.advanceBlockTo(deregisterRequestInfo.lockupExpiryBlock)
        assert.isFalse(await claimsManager.claimPending(stakerAccount), 'Expect no claim pending')
        // Withdraw all stake
        await serviceProviderFactory.decreaseStake({ from: stakerAccount })
        let acctInfo = await getAccountStakeInfo(stakerAccount)
        assert.isTrue(acctInfo.totalInStakingContract.eq(_lib.toBN(0)), 'Expect default in staking')
        assert.isTrue(acctInfo.spFactoryStake.eq(_lib.toBN(0)), 'Expect default in sp factory')
        assert.isTrue(acctInfo.numberOfEndpoints.eq(_lib.toBN(0)), 'Expect no endpoints in sp factory')

        // Initiate round
        await claimsManager.initiateRound({ from: stakerAccount2 })
        // Expect no claim pending even though lastClaimed for this SP is < the round initiated
        // Achieved by number of endpoints check in ClaimsManager
        assert.isFalse(await claimsManager.claimPending(stakerAccount), 'Expect no claim pending')
        // Attempt to re-register endpoint
        // Confirm re-registration is allowed
        await _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint,
          DEFAULT_AMOUNT,
          stakerAccount
        )
        acctInfo = await getAccountStakeInfo(stakerAccount)
        assert.isTrue(acctInfo.totalInStakingContract.eq(DEFAULT_AMOUNT), 'Expect default in staking')
        assert.isTrue(acctInfo.spFactoryStake.eq(DEFAULT_AMOUNT), 'Expect default in sp factory')
      })

      it('Decrease in reward for pending stake decrease', async () => {
        // At the start of this test, we have 2 SPs each with DEFAULT_AMOUNT staked
        let fundsPerRound = await claimsManager.getFundsPerRound()
        let expectedIncrease = fundsPerRound.div(_lib.toBN(4))
        // Request decrease in stake corresponding to 1/2 of DEFAULT_AMOUNT
        await serviceProviderFactory.requestDecreaseStake(DEFAULT_AMOUNT.div(_lib.toBN(2)), { from: stakerAccount })
        let info = await getAccountStakeInfo(stakerAccount)
        await claimsManager.initiateRound({ from: stakerAccount })
        await delegateManager.claimRewards({ from: stakerAccount })
        let info2 = await getAccountStakeInfo(stakerAccount)
        let stakingDiff = (info2.totalInStakingContract).sub(info.totalInStakingContract)
        let spFactoryDiff = (info2.spFactoryStake).sub(info.spFactoryStake)
        assert.isTrue(stakingDiff.eq(expectedIncrease), 'Expected increase not found in Staking.sol')
        assert.isTrue(spFactoryDiff.eq(expectedIncrease), 'Expected increase not found in SPFactory')
      })

      it('Slash cancels pending undelegate request', async () => {
        await serviceProviderFactory.requestDecreaseStake(DEFAULT_AMOUNT.div(_lib.toBN(2)), { from: stakerAccount })
        let requestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
        assert.isTrue((requestInfo.lockupExpiryBlock).gt(_lib.toBN(0)), 'Expected lockup expiry block to be set')
        assert.isTrue((requestInfo.amount).gt(_lib.toBN(0)), 'Expected amount to be set')
        
        // Slash
        await _lib.slash(_lib.audToWei(5), slasherAccount, governance, delegateManagerKey, guardianAddress, true)

        requestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
        assert.isTrue((requestInfo.lockupExpiryBlock).eq(_lib.toBN(0)), 'Expected lockup expiry block reset')
        assert.isTrue((requestInfo.amount).eq(_lib.toBN(0)), 'Expected amount reset')
      })

      it('Update lockup duration', async () => {
        let duration = await serviceProviderFactory.getDecreaseStakeLockupDuration()
        // Double decrease stake duration
        let newDuration = duration.add(duration)
        
        await _lib.assertRevert(
          serviceProviderFactory.updateDecreaseStakeLockupDuration(newDuration),
          "Only callable by Governance contract"
        )

        const updateDSLDTxReceipt = await governance.guardianExecuteTransaction(
          serviceProviderFactoryKey,
          _lib.toBN(0),
          'updateDecreaseStakeLockupDuration(uint256)',
          _lib.abiEncode(['uint256'], [_lib.fromBN(newDuration)]),
          { from: guardianAddress }
        )
        assert.isTrue(_lib.parseTx(updateDSLDTxReceipt).event.args.success, 'Expected tx to succeed')

        let updatedDuration = await serviceProviderFactory.getDecreaseStakeLockupDuration()
        assert.isTrue(updatedDuration.eq(newDuration), 'Update not reflected')
        let tx = await serviceProviderFactory.requestDecreaseStake(DEFAULT_AMOUNT.div(_lib.toBN(2)), { from: stakerAccount })
        let blocknumber = _lib.toBN(tx.receipt.blockNumber)
        let requestInfo = await serviceProviderFactory.getPendingDecreaseStakeRequest(stakerAccount)
        assert.isTrue(
          (blocknumber.add(updatedDuration)).eq(requestInfo.lockupExpiryBlock),
          'Unexpected blocknumber'
        )
      })
    })
  })
})
