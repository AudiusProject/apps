import * as _lib from './_lib/lib.js'
const encodeCall = require('../utils/encodeCall')

const AudiusToken = artifacts.require('AudiusToken')
const Registry = artifacts.require('Registry')
const Staking = artifacts.require('Staking')
const AudiusAdminUpgradeabilityProxy = artifacts.require('AudiusAdminUpgradeabilityProxy')
const ServiceTypeManager = artifacts.require('ServiceTypeManager')
const ServiceProviderFactory = artifacts.require('ServiceProviderFactory')

const stakingProxyKey = web3.utils.utf8ToHex('StakingProxy')
const serviceProviderFactoryKey = web3.utils.utf8ToHex('ServiceProviderFactory')
const serviceTypeManagerProxyKey = web3.utils.utf8ToHex('ServiceTypeManagerProxy')
const claimsManagerProxyKey = web3.utils.utf8ToHex('ClaimsManagerProxy')
const delegateManagerKey = web3.utils.utf8ToHex('DelegateManager')
const governanceKey = web3.utils.utf8ToHex('Governance')

const testDiscProvType = web3.utils.utf8ToHex('discovery-provider')
const testCreatorNodeType = web3.utils.utf8ToHex('creator-node')
const testEndpoint = 'https://localhost:5000'
const testEndpoint1 = 'https://localhost:5001'

const MIN_STAKE_AMOUNT = 10

const INITIAL_BAL = _lib.audToWeiBN(1000)
const DEFAULT_AMOUNT = _lib.audToWeiBN(120)


contract('ServiceProvider test', async (accounts) => {
  let token, registry, staking0, stakingInitializeData, proxy
  let staking, serviceProviderFactory, serviceTypeManager

  const [deployerAddress, proxyAdminAddress, proxyDeployerAddress] = accounts
  let controllerAddress

  beforeEach(async () => {
    token = await AudiusToken.new({ from: deployerAddress })
    await token.initialize()
    registry = await Registry.new()
    await registry.initialize()

    // Set up staking
    staking0 = await Staking.new({ from: proxyAdminAddress })
    stakingInitializeData = encodeCall(
      'initialize',
      ['address', 'address', 'bytes32', 'bytes32', 'bytes32'],
      [
        token.address,
        registry.address,
        claimsManagerProxyKey,
        delegateManagerKey,
        serviceProviderFactoryKey
      ]
    )

    proxy = await AudiusAdminUpgradeabilityProxy.new(
      staking0.address,
      proxyAdminAddress,
      stakingInitializeData,
      registry.address,
      governanceKey,
      { from: proxyDeployerAddress }
    )

    staking = await Staking.at(proxy.address)
    await registry.addContract(stakingProxyKey, proxy.address, { from: deployerAddress })

    // Deploy service type manager
    controllerAddress = accounts[9]
    let serviceTypeInitializeData = encodeCall(
      'initialize',
      ['address', 'address', 'bytes32'],
      [
        registry.address,
        controllerAddress,
        governanceKey
      ]
    )
    let serviceTypeManager0 = await ServiceTypeManager.new({ from: deployerAddress })
    let serviceTypeManagerProxy = await AudiusAdminUpgradeabilityProxy.new(
      serviceTypeManager0.address,
      proxyAdminAddress,
      serviceTypeInitializeData,
      registry.address,
      governanceKey,
      { from: proxyAdminAddress }
    )
    serviceTypeManager = await ServiceTypeManager.at(serviceTypeManagerProxy.address)
    // Register creator node
    await serviceTypeManager.addServiceType(
      testCreatorNodeType,
      _lib.audToWeiBN(10),
      _lib.audToWeiBN(10000000),
      { from: controllerAddress })
    // Register discovery provider
    await serviceTypeManager.addServiceType(
      testDiscProvType,
      _lib.audToWeiBN(5),
      _lib.audToWeiBN(10000000),
      { from: controllerAddress })

    await registry.addContract(serviceTypeManagerProxyKey, serviceTypeManagerProxy.address, { from: deployerAddress })

    // Deploy ServiceProviderFactory
    let serviceProviderFactory0 = await ServiceProviderFactory.new({ from: deployerAddress })
    const serviceProviderFactoryCalldata = encodeCall(
      'initialize',
      ['address', 'bytes32', 'bytes32', 'bytes32', 'bytes32'],
      [registry.address, stakingProxyKey, delegateManagerKey, governanceKey, serviceTypeManagerProxyKey]
    )
    let serviceProviderFactoryProxy = await AudiusAdminUpgradeabilityProxy.new(
      serviceProviderFactory0.address,
      proxyAdminAddress,
      serviceProviderFactoryCalldata,
      registry.address,
      governanceKey,
      { from: proxyAdminAddress }
    )
    serviceProviderFactory = await ServiceProviderFactory.at(serviceProviderFactoryProxy.address)
    await registry.addContract(serviceProviderFactoryKey, serviceProviderFactoryProxy.address, { from: deployerAddress })

    // Transfer 1000 tokens to accounts[11]
    await token.transfer(accounts[11], INITIAL_BAL, { from: deployerAddress })
  })

  /* Helper functions */

  const increaseRegisteredProviderStake = async (increase, account) => {
    // Approve token transfer
    await token.approve(
      staking.address,
      increase,
      { from: account }
    )

    const tx = await serviceProviderFactory.increaseStake(
      increase,
      { from: account }
    )

    const args = tx.logs.find(log => log.event === 'UpdatedStakeAmount').args
    return args
  }

  const getStakeAmountForAccount = async (account) => staking.totalStakedFor(account)

  const decreaseRegisteredProviderStake = async (decrease, account) => {
    // Approve token transfer from staking contract to account
    const tx = await serviceProviderFactory.decreaseStake(
      decrease,
      { from: account }
    )

    const args = tx.logs.find(log => log.event === 'UpdatedStakeAmount').args
    return args
  }

  const getServiceProviderIdsFromAddress = async (account, type) => {
    return serviceProviderFactory.getServiceProviderIdsFromAddress(account, type)
  }

  const serviceProviderIDRegisteredToAccount = async (account, type, id) => {
    const ids = await getServiceProviderIdsFromAddress(account, type)
    for (let i = 0; i < ids.length; i++) {
      if (ids[i].eq(id)) { return true }
    }
    return false
  }

  describe('Registration flow', () => {
    let regTx
    const stakerAccount = accounts[11]
    const stakerAccount2 = accounts[12]

    beforeEach(async () => {
      const initialBal = await token.balanceOf(stakerAccount)

      regTx = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint,
        DEFAULT_AMOUNT,
        stakerAccount
      )

      // Confirm event has correct amount
      assert.isTrue(regTx.stakeAmount.eq(DEFAULT_AMOUNT))

      const numProviders = await serviceProviderFactory.getTotalServiceTypeProviders(testDiscProvType)
      assert.isTrue(numProviders.eq(web3.utils.toBN(1)), 'Expect 1 for test disc prov type')

      const spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      assert.isTrue(spDetails.numberOfEndpoints.eq(web3.utils.toBN(1)), 'Expect 1 endpoint registered')

      // Confirm balance updated for tokens
      const finalBal = await token.balanceOf(stakerAccount)
      assert.isTrue(initialBal.eq(finalBal.add(DEFAULT_AMOUNT)), 'Expect funds to be transferred')

      const newIdFound = await serviceProviderIDRegisteredToAccount(
        stakerAccount,
        testDiscProvType,
        regTx.spID
      )
      assert.isTrue(
        newIdFound,
        'Expected to find newly registered ID associated with this account'
      )

      assert.isTrue(
        (await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT),
        'Expected default stake amount'
      )

      const spTypeInfo = await serviceTypeManager.getServiceTypeStakeInfo(testDiscProvType)
      const typeMin = _lib.fromWei(spTypeInfo[0])
      const typeMax = _lib.fromWei(spTypeInfo[1])

      // Validate stake requirements
      // Both current account bounds and single testDiscProvType bounds expected to be equal
      assert.equal(
        typeMin,
        _lib.fromWei(spDetails.minAccountStake),
        'Expect account min to equal sp type 1 min'
      )
      assert.equal(
        typeMax,
        _lib.fromWei(spDetails.maxAccountStake),
        'Expect account max to equal sp type 1 max'
      )
    })

    const multipleEndpointScenario = async (increaseStake = true) => {
      let increaseAmt = DEFAULT_AMOUNT
      let initialBal = await token.balanceOf(stakerAccount)
      let initialStake = await getStakeAmountForAccount(stakerAccount)

      // 2nd endpoint for stakerAccount = https://localhost:5001
      // Total Stake = 240 AUD
      let registerInfo = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint1,
        increaseAmt,
        stakerAccount)
      let newSPId = registerInfo.spID

      // Confirm change in token balance
      let finalBal = await token.balanceOf(stakerAccount)
      let finalStake = await getStakeAmountForAccount(stakerAccount)

      assert.equal(
        (initialBal - finalBal),
        increaseAmt,
        'Expected decrease in final balance')

      assert.equal(
        (finalStake - initialStake),
        increaseAmt,
        'Expected increase in total stake')

      let newIdFound = await serviceProviderIDRegisteredToAccount(
        stakerAccount,
        testDiscProvType,
        newSPId)
      assert.isTrue(newIdFound, 'Expected valid new ID')

      // 3rd endpoint for stakerAccount
      // Transfer 1000 tokens to staker for test
      await token.transfer(stakerAccount, INITIAL_BAL, { from: deployerAddress })

      let stakedAmount = await staking.totalStakedFor(stakerAccount)
      let spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      let accountMin = _lib.fromWei(spDetails.minAccountStake)
      let accountMax = _lib.fromWei(spDetails.maxAccountStake)

      let accountDiff = _lib.fromWei(stakedAmount) - accountMin

      await decreaseRegisteredProviderStake(_lib.audToWeiBN(accountDiff), stakerAccount)
      stakedAmount = await staking.totalStakedFor(stakerAccount)

      let testEndpoint = 'https://localhost:4000'
      let testEndpoint2 = 'https://localhost:4001'

      let cnTypeInfo = await serviceTypeManager.getServiceTypeStakeInfo(testCreatorNodeType)
      let cnTypeMin = cnTypeInfo[0]
      let cnTypeMax = cnTypeInfo[1]
      let dpTypeInfo = await serviceTypeManager.getServiceTypeStakeInfo(testDiscProvType)
      let dpTypeMin = dpTypeInfo[0]

      // 3rd endpoint for stakerAccount = https://localhost:4001
      // Total Stake = 240 AUD <-- Expect failure
      await _lib.assertRevert(
        _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testCreatorNodeType,
          testEndpoint,
          0,
          stakerAccount),
        'Minimum stake threshold')

      let registerInfo2 = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testCreatorNodeType,
        testEndpoint,
        cnTypeMin,
        stakerAccount)

      let testDiscProvs = await getServiceProviderIdsFromAddress(stakerAccount, testDiscProvType)
      let testCnodes = await getServiceProviderIdsFromAddress(stakerAccount, testCreatorNodeType)
      let cnodeMinStake = cnTypeMin * testCnodes.length
      let dpMinStake = dpTypeMin * testDiscProvs.length

      stakedAmount = await staking.totalStakedFor(stakerAccount)
      assert.equal(stakedAmount, dpMinStake + cnodeMinStake, 'Expect min staked with total endpoints')

      spDetails = await serviceProviderFactory.getServiceProviderDetails(stakerAccount)
      let stakedAmountWei = _lib.fromWei(stakedAmount)
      accountMin = _lib.fromWei(spDetails.minAccountStake)
      accountMax = _lib.fromWei(spDetails.maxAccountStake)
      assert.equal(stakedAmountWei, accountMin, 'Expect min staked with total endpoints')

      accountDiff = accountMax - stakedAmountWei
      // Generate BNjs value
      let transferAmount = web3.utils.toBN(
        accountDiff
      ).add(
        web3.utils.toBN(_lib.fromWei(cnTypeMax))
      ).add(
        web3.utils.toBN(200)
      )

      // Transfer greater than max tokens
      await token.transfer(stakerAccount, _lib.audToWeiBN(transferAmount), { from: deployerAddress })

      // Attempt to register, expect max stake bounds to be exceeded
      await _lib.assertRevert(
        _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testCreatorNodeType,
          testEndpoint2,
          _lib.audToWeiBN(transferAmount),
          stakerAccount),
        'Maximum stake'
      )

      let numCnodes = await getServiceProviderIdsFromAddress(stakerAccount, testCreatorNodeType)

      registerInfo2 = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testCreatorNodeType,
        testEndpoint2,
        cnTypeMin,
        stakerAccount)

      assert.equal(
        numCnodes.length + 1,
        (await getServiceProviderIdsFromAddress(stakerAccount, testCreatorNodeType)).length,
        'Expect increase in number of endpoints')
    }

    it('Confirm correct stake for account', async () => {
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT))
    })

    it('Remove endpoint and confirm transfer of staking balance to owner', async () => {
      // Confirm staking contract has correct amt
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT))

      // deregister service provider
      let deregTx = await _lib.deregisterServiceProvider(
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint,
        stakerAccount
      )

      assert.isTrue(deregTx.spID.eq(regTx.spID))

      assert.isTrue(deregTx.unstakeAmount.eq(DEFAULT_AMOUNT))

      // Confirm no stake is remaining in staking contract
      assert.isTrue((await staking.totalStakedFor(stakerAccount)).isZero())

      // Test 3
      assert.isTrue(
        (await token.balanceOf(stakerAccount)).eq(INITIAL_BAL),
        'Expect full amount returned to staker after deregistering'
      )
    })

    it('fails to register duplicate endpoint w/same account', async () => {
      // Attempt to register dup endpoint with the same account
      await _lib.assertRevert(
        _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint,
          DEFAULT_AMOUNT,
          stakerAccount
        ),
        'Endpoint already registered'
      )
    })

    it('Attempt to register first endpoint with zero stake, expect error', async () => {
      await token.transfer(
        stakerAccount2,
        MIN_STAKE_AMOUNT - 1,
        { from: deployerAddress }
      )

      // Attempt to register first endpoint with zero stake
      await _lib.assertRevert(
        _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint1,
          MIN_STAKE_AMOUNT - 1,
          stakerAccount2
        ),
        'Minimum stake threshold exceeded'
      )
    })

    it('fails to register endpoint w/zero stake', async () => {
      await _lib.assertRevert(
        _lib.registerServiceProvider(
          token,
          staking,
          serviceProviderFactory,
          testDiscProvType,
          testEndpoint1,
          0,
          stakerAccount2
        ),
        'Minimum stake threshold exceeded'
      )
    })

    it('increases stake value', async () => {
      // Confirm initial amount in staking contract
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT))

      await increaseRegisteredProviderStake(
        DEFAULT_AMOUNT,
        stakerAccount
      )

      // Confirm increased amount in staking contract
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT.mul(_lib.toBN(2))))
    })

    it('decreases stake value', async () => {
      // Confirm initial amount in staking contract
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT))

      const initialBal = await token.balanceOf(stakerAccount)
      const decreaseStakeAmount = DEFAULT_AMOUNT.div(_lib.toBN(2))

      await decreaseRegisteredProviderStake(decreaseStakeAmount, stakerAccount)

      // Confirm decreased amount in staking contract
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(decreaseStakeAmount))

      // Confirm balance
      assert.isTrue(
        (await token.balanceOf(stakerAccount)).eq(initialBal.add(decreaseStakeAmount)),
        'Expect increase in token balance after decreasing stake'
      )
    })

    it('fails to decrease more than staked', async () => {
      // Confirm initial amount in staking contract
      assert.isTrue((await getStakeAmountForAccount(stakerAccount)).eq(DEFAULT_AMOUNT))
      
      let decreaseStakeAmount = DEFAULT_AMOUNT + 2
      await _lib.assertRevert(
        decreaseRegisteredProviderStake(decreaseStakeAmount, stakerAccount)
      )
    })

    it('fails to decrease stake to zero without deregistering SPs', async () => {
      // Confirm initial amount in staking contract
      const initialStake = await staking.totalStakedFor(stakerAccount)
      assert.isTrue(initialStake.eq(DEFAULT_AMOUNT))

      // TODO - Confirm this is the right behavior?
      await _lib.assertRevert(
        decreaseRegisteredProviderStake(
          initialStake,
          stakerAccount
        ),
        'Please deregister endpoints to remove all stake'
      )
    })

    it('Update delegateOwnerWallet & validate function restrictions', async () => {
      let spID = await serviceProviderFactory.getServiceProviderIdFromEndpoint(testEndpoint)
      let info = await serviceProviderFactory.getServiceEndpointInfo(testDiscProvType, spID)
      let currentDelegateOwnerWallet = info.delegateOwnerWallet

      assert.equal(
        stakerAccount,
        currentDelegateOwnerWallet,
        'Expect initial delegateOwnerWallet equal to registrant')
      // Confirm wrong owner update is rejected
      await _lib.assertRevert(
        serviceProviderFactory.updateDelegateOwnerWallet(
          testDiscProvType,
          testEndpoint,
          accounts[7],
          { from: accounts[8] }
        ),
        'Invalid update'
      )
      // Perform and validate update
      let newDelegateOwnerWallet = accounts[4]
      let tx = await serviceProviderFactory.updateDelegateOwnerWallet(
        testDiscProvType,
        testEndpoint,
        newDelegateOwnerWallet,
        { from: stakerAccount })

      info = await serviceProviderFactory.getServiceEndpointInfo(testDiscProvType, spID)
      let newDelegateFromChain = info.delegateOwnerWallet

      assert.equal(
        newDelegateOwnerWallet,
        newDelegateFromChain,
        'Expect updated delegateOwnerWallet equivalency')
    })

    /*
     * Register a new endpoint under the same account, adding stake to the account
     */
    it('multiple endpoints w/same account, increase stake', async () => {
      let increaseAmt = DEFAULT_AMOUNT
      let initialBal = await token.balanceOf(stakerAccount)
      let initialStake = await getStakeAmountForAccount(stakerAccount)

      let registerInfo = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint1,
        increaseAmt,
        stakerAccount
      )
      let newSPId = registerInfo.spID

      // Confirm change in token balance
      let finalBal = await token.balanceOf(stakerAccount)
      let finalStake = await getStakeAmountForAccount(stakerAccount)

      assert.equal(
        (initialBal - finalBal),
        increaseAmt,
        'Expected decrease in final balance')

      assert.equal(
        (finalStake - initialStake),
        increaseAmt,
        'Expected increase in total stake')

      let newIdFound = await serviceProviderIDRegisteredToAccount(
        stakerAccount,
        testDiscProvType,
        newSPId)
      assert.isTrue(newIdFound, 'Expected valid new ID')
    })

    it('multiple endpoints w/multiple accounts varying stake', async () => {
      await multipleEndpointScenario(true)
    })

    /*
     * Register a new endpoint under the same account, without adding stake to the account
     */
    it('multiple endpoints w/same account, static stake', async () => {
      const initialBal = await token.balanceOf(stakerAccount)
      const registerInfo = await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        testDiscProvType,
        testEndpoint1,
        0,
        stakerAccount
      )
      const newSPId = registerInfo.spID

      // Confirm change in token balance
      const finalBal = await token.balanceOf(stakerAccount)
      assert.isTrue(
        initialBal.sub(finalBal).isZero(),
        'Expected no change in final balance'
      )
      const newIdFound = await serviceProviderIDRegisteredToAccount(
        stakerAccount,
        testDiscProvType,
        newSPId
      )
      assert.isTrue(newIdFound, 'Expected valid new ID')
    })

    it('will modify the dns endpoint for an existing service', async () => {
      const spId = await serviceProviderFactory.getServiceProviderIdFromEndpoint(testEndpoint)
      const { endpoint } = await serviceProviderFactory.getServiceEndpointInfo(testDiscProvType, spId)
      assert.equal(testEndpoint, endpoint)
      
      // update the endpoint from testEndpoint to testEndpoint1
      await serviceProviderFactory.updateEndpoint(testDiscProvType, testEndpoint, testEndpoint1, { from: stakerAccount })
      const { endpoint: endpointAfter } = await serviceProviderFactory.getServiceEndpointInfo(testDiscProvType, spId)
      assert.equal(testEndpoint1, endpointAfter)

      // it should replace the service provider in place so spId should be consistent
      const spIdNew = await serviceProviderFactory.getServiceProviderIdFromEndpoint(testEndpoint1)
      assert.isTrue(spId.eq(spIdNew))
    })

    it('will fail to modify the dns endpoint for the wrong owner', async () => {
      // will try to update the endpoint from the incorrect account
      await _lib.assertRevert(
        serviceProviderFactory.updateEndpoint(testDiscProvType, testEndpoint, testEndpoint1),
        'Invalid update endpoint operation, wrong owner'
      )
    })
    
    it('will fail to modify the dns endpoint if the dns endpoint doesnt exist', async () => {
      // will try to update the endpoint from the incorrect account
      const fakeEndpoint = 'https://does.not.exist.com'
      await _lib.assertRevert(
        serviceProviderFactory.updateEndpoint(testDiscProvType, fakeEndpoint, testEndpoint1),
        'Could not find service provider with that endpoint'
      )
    })

    it('service type operations test', async () => {
      let typeMin = _lib.audToWeiBN(200)
      let typeMax = _lib.audToWeiBN(20000)
      let testType = web3.utils.utf8ToHex('test-service')
      let isValid = await serviceTypeManager.isValidServiceType(testType)
      assert.isTrue(!isValid, 'Invalid type expected')

      // Expect failure as type is already present
      await _lib.assertRevert(
        serviceTypeManager.addServiceType(testDiscProvType, typeMin, typeMax, { from: controllerAddress }),
        'Already known service type'
      )
      // Expect failure from invalid account
      await _lib.assertRevert(
        serviceTypeManager.addServiceType(testDiscProvType, typeMin, typeMax, { from: accounts[12] }),
        'Only controller or governance'
      )

      // Add new type
      await serviceTypeManager.addServiceType(testType, typeMin, typeMax, { from: controllerAddress })

      // Confirm presence of test type in list
      let validTypes = (await serviceTypeManager.getValidServiceTypes()).map(x => web3.utils.hexToUtf8(x))
      let typeFound = false
      for (let type of validTypes) {
        if (type === web3.utils.hexToUtf8(testType)) typeFound = true
      }
      assert.isTrue(typeFound, 'Expect type to be found in valid list')

      // Set service version
      let testVersion = web3.utils.utf8ToHex('0.0.1')
      await serviceTypeManager.setServiceVersion(testType, testVersion, { from: controllerAddress })
      await _lib.assertRevert(
        serviceTypeManager.setServiceVersion(testType, testVersion, { from: controllerAddress }),
        'Already registered')
      let chainVersion = await serviceTypeManager.getCurrentVersion(testType)
      assert.equal(
        web3.utils.hexToUtf8(testVersion),
        web3.utils.hexToUtf8(chainVersion),
        'Expect test version to be set')

      let testVersion2 = web3.utils.utf8ToHex('0.0.2')

      // Update version again
      await serviceTypeManager.setServiceVersion(testType, testVersion2, { from: controllerAddress })
      // Validate number of versions
      let numVersions = await serviceTypeManager.getNumberOfVersions(testType)
      assert.isTrue(numVersions.eq(web3.utils.toBN(2)), 'Expect 2 versions')
      let lastIndex = numVersions.sub(web3.utils.toBN(1))
      let lastIndexVersionFromChain = await serviceTypeManager.getVersion(testType, lastIndex)
      // Additional validation
      assert.equal(
        web3.utils.hexToUtf8(lastIndexVersionFromChain),
        web3.utils.hexToUtf8(testVersion2),
        'Latest version equals expected')
      assert.equal(
        lastIndexVersionFromChain,
        await serviceTypeManager.getCurrentVersion(testType),
        'Expect equal current and last index')

      isValid = await serviceTypeManager.isValidServiceType(testType)
      assert.isTrue(isValid, 'Expect valid type after registration')

      let info = await serviceTypeManager.getServiceTypeStakeInfo(testType)
      assert.isTrue(typeMin.eq(info.min), 'Min values not equal')
      assert.isTrue(typeMax.eq(info.max), 'Max values not equal')

      let newMin = _lib.audToWeiBN(300)
      let newMax = _lib.audToWeiBN(40000)

      let unregisteredType = web3.utils.utf8ToHex('invalid-service')
      // Expect failure with unknown type
      await _lib.assertRevert(
        serviceTypeManager.updateServiceType(unregisteredType, newMin, newMax, { from: controllerAddress }),
        'Invalid service type'
      )
      // Expect failure from invalid account
      await _lib.assertRevert(
        serviceTypeManager.updateServiceType(testType, newMin, newMax, { from: accounts[12] }),
        'Only controller or governance'
      )
      await serviceTypeManager.updateServiceType(testType, newMin, newMax, { from: controllerAddress })

      // Confirm update
      info = await serviceTypeManager.getServiceTypeStakeInfo(testType)
      assert.isTrue(newMin.eq(info.min), 'Min values not equal')
      assert.isTrue(newMax.eq(info.max), 'Max values not equal')

      await _lib.assertRevert(
        serviceTypeManager.removeServiceType(unregisteredType, { from: controllerAddress }), 'Invalid service type, not found'
      )
      await _lib.assertRevert(
        serviceTypeManager.removeServiceType(testType, { from: accounts[12] }), 'Only controller or governance'
      )

      await serviceTypeManager.removeServiceType(testType, { from: controllerAddress })

      isValid = await serviceTypeManager.isValidServiceType(testType)
      assert.isTrue(!isValid, 'Expect invalid type after deregistration')
    })
  })
})
