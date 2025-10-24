import { web3 } from '@openzeppelin/test-helpers/src/setup'
import * as _lib from '../../utils/lib.js'
const { time } = require('@openzeppelin/test-helpers')

const Staking = artifacts.require('Staking')
const Governance = artifacts.require('Governance')
const ServiceTypeManager = artifacts.require('ServiceTypeManager')
const ServiceProviderFactory = artifacts.require('ServiceProviderFactory')
const DelegateManager = artifacts.require('DelegateManager')
const ClaimsManager = artifacts.require('ClaimsManager')
const AudiusToken = artifacts.require('AudiusToken')

const serviceTypeCN = web3.utils.utf8ToHex('creator-node')
const serviceTypeDP = web3.utils.utf8ToHex('discovery-provider')

contract('Random testing', async (accounts) => {
  let token, staking, serviceTypeManager, serviceProviderFactory
  let claimsManager, governance, delegateManager
  let users = []
  let logs = {}
  let cnTypeInfo, dpTypeInfo
  let currentRound = 1

  // Test tracking statistics
  let totalClaimedRewards = _lib.toBN(0)
  let totalDeployerStaked = _lib.toBN(0)
  let totalDelegatedAmount = _lib.toBN(0)
  let totalSlashedAmount = _lib.toBN(0)
  let numDelegateOperations = _lib.toBN(0)
  let numRemoveDelegatorOps = _lib.toBN(0)
  let numDecreaseStakeOperations = _lib.toBN(0)
  let numSlashOperations = _lib.toBN(0)

  const printTestSummary = () => {
    console.log(
      `\n------------------------ AUDIUS RANDOM TESTING Summary ------------------------`
    )
    console.log(
      `totalClaimedRewards: ${totalClaimedRewards}                | Total claimed through protocol rewards`
    )
    console.log(
      `totalDeployerStaked: ${totalDeployerStaked}                | Total staked directly deployers`
    )
    console.log(
      `totalDelegatedAmount: ${totalDelegatedAmount}              | Total delegated `
    )
    console.log(
      `totalSlashedAmount: ${totalSlashedAmount}                  | Total slashed value `
    )
    console.log(
      `numDelegateOperations: ${numDelegateOperations}            | Number of delegate operations`
    )
    console.log(
      `numDecreaseStakeOperations: ${numDecreaseStakeOperations}  | Number of successfully evaluated decrease stake operations`
    )
    console.log(
      `numRemoveDelegatorOps: ${numRemoveDelegatorOps}            | Number of remove delegator operations`
    )
    console.log(
      `numSlashOperations: ${numSlashOperations}                  | Number of slash operations`
    )
  }

  // proxyDeployerAddress is used to transfer tokens to service accounts as needed
  const proxyDeployerAddress = accounts[11]
  // guardian is equal to proxyDeployer for test purposes
  const guardianAddress = proxyDeployerAddress
  const claimsManagerProxyKey = web3.utils.utf8ToHex('ClaimsManagerProxy')
  const governanceRegKey = web3.utils.utf8ToHex('Governance')
  const serviceProviderFactoryKey = web3.utils.utf8ToHex(
    'ServiceProviderFactory'
  )
  const delegateManagerKey = web3.utils.utf8ToHex('DelegateManager')
  const userOffset = 25

  const numUsers = 15
  const minNumServicesPerUser = 1
  const maxNumServicesPerUser = 2 // TODO: CONSUME THIS

  const FundingRoundBlockDiffForTest = 200
  const VotingPeriod = 10
  const ExecutionDelayBlocks = 10
  const UndelegateLockupDuration = 21
  const DecreaseStakeLockupDuration = 21
  const RemoveDelegatorLockupDuration = 21
  const DeployerCutLockupDuration = FundingRoundBlockDiffForTest + 1
  const SystemUser = 'system'
  const TestDuration = 7200000

  // TODO: Add non-SP delegators after everything else
  beforeEach(async () => {
    // Select user slice
    users = accounts.slice(userOffset, userOffset + numUsers)
    // Initialize in memory log
    logs[SystemUser] = []
    users.map((user) => {
      logs[user] = []
    })
    token = await AudiusToken.at(process.env.tokenAddress)
    governance = await Governance.at(process.env.governanceAddress)
    staking = await Staking.at(process.env.stakingAddress)
    claimsManager = await ClaimsManager.at(process.env.claimsManagerAddress)
    serviceProviderFactory = await ServiceProviderFactory.at(
      process.env.serviceProviderFactoryAddress
    )
    let serviceTypeManagerAddrFromSPFactory =
      await serviceProviderFactory.getServiceTypeManagerAddress()
    serviceTypeManager = await ServiceTypeManager.at(
      serviceTypeManagerAddrFromSPFactory
    )
    const delManAddrFromClaimsManager =
      await claimsManager.getDelegateManagerAddress()
    delegateManager = await DelegateManager.at(delManAddrFromClaimsManager)
    if (accounts.length < numUsers) {
      // Disabled for CI, pending modification of total accounts
      sysLog(
        `Insufficient accounts found - required ${numUsers}, found ${accounts.length}`
      )
      return
    }
    cnTypeInfo = await serviceTypeManager.getServiceTypeInfo(serviceTypeCN)
    dpTypeInfo = await serviceTypeManager.getServiceTypeInfo(serviceTypeDP)
    sysLog(`proxyDeployer: ${proxyDeployerAddress}`)
    sysLog(
      `AudiusToken: ${token.address}, expected ${process.env.tokenAddress}`
    )
    sysLog(
      `Governance: ${governance.address}, expected ${process.env.governanceAddress}`
    )
    sysLog(
      `Deployer balance: ${(
        await token.balanceOf(proxyDeployerAddress)
      ).toString()}`
    )
    sysLog(
      `Staking: ${staking.address}, expected ${process.env.stakingAddress}`
    )
    sysLog(
      `ClaimsManager: ${claimsManager.address}, expected ${process.env.claimsManagerAddress}`
    )
    sysLog(
      `ServiceProviderFactory: ${serviceProviderFactory.address}, expected ${process.env.serviceProviderFactoryAddress}`
    )
    sysLog(
      `ServiceTypeManager Address from ServiceProviderFactory.sol: ${serviceTypeManagerAddrFromSPFactory}`
    )
    sysLog(
      `ServiceTypeManager: ${serviceTypeManager.address}, expected ${serviceTypeManagerAddrFromSPFactory}`
    )
    sysLog(
      `DelegateManager: ${delegateManager.address}, expected ${delManAddrFromClaimsManager}`
    )
    sysLog(
      `CN: ${serviceTypeCN} - min: ${cnTypeInfo.minStake}, max: ${cnTypeInfo.maxStake}`
    )
    sysLog(
      `DP: ${serviceTypeDP} - min: ${dpTypeInfo.minStake}, max: ${dpTypeInfo.maxStake}`
    )

    await initializeTestState()
  })

  const initializeTestState = async () => {
    const curBlockDiff = await claimsManager.getFundingRoundBlockDiff.call()
    sysLog(`Current block diff: ${curBlockDiff}`)
    // Local dev sanity config updates
    // https://github.com/AudiusProject/apps/commit/12116eede803b395a9518c707360e7b633cf6ad2
    // Update funding found block diff
    await governance.guardianExecuteTransaction(
      claimsManagerProxyKey,
      _lib.toBN(0),
      'updateFundingRoundBlockDiff(uint256)',
      _lib.abiEncode(['uint256'], [FundingRoundBlockDiffForTest]),
      { from: guardianAddress }
    )
    sysLog(`Updated fundingRoundBlockDiff to ${FundingRoundBlockDiffForTest}`)
    const newBlockDiff = await claimsManager.getFundingRoundBlockDiff.call()
    sysLog(`Updated fundingRoundBlockDiff from ClaimsManager: ${newBlockDiff}`)
    // Set voting period
    await governance.guardianExecuteTransaction(
      governanceRegKey,
      _lib.toBN(0),
      'setVotingPeriod(uint256)',
      _lib.abiEncode(['uint256'], [VotingPeriod]),
      { from: guardianAddress }
    )
    sysLog(`Updated VotingPeriod to ${VotingPeriod}`)
    // Set execution delay
    await governance.guardianExecuteTransaction(
      governanceRegKey,
      _lib.toBN(0),
      'setExecutionDelay(uint256)',
      _lib.abiEncode(['uint256'], [ExecutionDelayBlocks]),
      { from: guardianAddress }
    )
    sysLog(`Updated executionDelay to ${ExecutionDelayBlocks}`)
    await governance.guardianExecuteTransaction(
      serviceProviderFactoryKey,
      _lib.toBN(0),
      'updateDecreaseStakeLockupDuration(uint256)',
      _lib.abiEncode(['uint256'], [DecreaseStakeLockupDuration]),
      { from: guardianAddress }
    )
    sysLog(
      `Updated decreaseStakeLockupDuration to ${DecreaseStakeLockupDuration}`
    )
    await governance.guardianExecuteTransaction(
      serviceProviderFactoryKey,
      _lib.toBN(0),
      'updateDeployerCutLockupDuration(uint256)',
      _lib.abiEncode(['uint256'], [DeployerCutLockupDuration]),
      { from: guardianAddress }
    )
    sysLog(`Updated deployerCutLockupDuration to ${DeployerCutLockupDuration}`)
    await governance.guardianExecuteTransaction(
      delegateManagerKey,
      _lib.toBN(0),
      'updateUndelegateLockupDuration(uint256)',
      _lib.abiEncode(['uint256'], [UndelegateLockupDuration]),
      { from: guardianAddress }
    )
    sysLog(`Updated undelegateLockupDuration to ${UndelegateLockupDuration}`)
    await governance.guardianExecuteTransaction(
      delegateManagerKey,
      _lib.toBN(0),
      'updateRemoveDelegatorLockupDuration(uint256)',
      _lib.abiEncode(['uint256'], [RemoveDelegatorLockupDuration]),
      { from: guardianAddress }
    )
    sysLog(
      `Updated removeDelegatorLockupDuration to ${RemoveDelegatorLockupDuration}`
    )
  }

  const rand = (min, max) => {
    return Math.floor(Math.random() * (max - min) + min)
  }

  const fromWei = (bn) => {
    return web3.utils.fromWei(bn.toString(), 'ether')
  }

  // Convert from wei -> eth to generate a random number
  // Helper converts back to wei prior to returning
  const randAmount = (min, max) => {
    let minNum = parseInt(fromWei(min))
    let maxNum = parseInt(fromWei(max))
    let randNum = rand(minNum, maxNum)
    return _lib.toBN(web3.utils.toWei(randNum.toString(), 'ether'))
  }

  const makeDummyEndpoint = (user, type) => {
    return `https://${user}-${type}:${rand(0, 10000000000)}`
  }

  const testLog = (user, msg) => {
    let time = new Date().toUTCString()
    if (user !== SystemUser) {
      console.log(`${time} | ${user} - ${msg}`)
    } else {
      console.log(`${time} | ${msg}`)
    }
    logs[user].push({
      user,
      time,
      currentRound,
      msg
    })
  }

  const sysLog = (msg) => {
    testLog(SystemUser, msg)
  }

  const printUserTestSummary = () => {
    let logKeys = Object.keys(logs)
    // Iterate over every user and print summary
    for (var key of logKeys) {
      console.log(`\n --------------- User ${key} ----------------`)
      let userLogs = logs[key]
      for (var entry of userLogs) {
        console.log(
          `${entry.user} | ${entry.time} | Round=${entry.currentRound} | ${entry.msg}`
        )
      }
    }
  }

  const getLatestBlock = async () => {
    return _lib.toBN((await web3.eth.getBlock('latest')).number)
  }

  const logCurrentBlock = async () => {
    let latestBlock = await getLatestBlock()
    sysLog(`currentBlock - ${latestBlock}`)
    return latestBlock
  }

  const getUserServiceInfo = async (user) => {
    let cnodeIds =
      await serviceProviderFactory.getServiceProviderIdsFromAddress(
        user,
        serviceTypeCN
      )
    if (!cnodeIds) {
      cnodeIds = []
    }
    let dpIds = await serviceProviderFactory.getServiceProviderIdsFromAddress(
      user,
      serviceTypeDP
    )
    if (!dpIds) {
      dpIds = []
    }
    let numServices = cnodeIds.length + dpIds.length
    return {
      cnodeIds,
      dpIds,
      numServices,
      user
    }
  }

  const addNewServiceForUser = async (user) => {
    try {
      // 50% chance of disc prov, 50% chance of creator node
      let serviceTypeDiceRoll = rand(0, 100)
      let amount
      let serviceType
      let typeInfo = null
      // TODO: Improve rand amount calculation
      if (serviceTypeDiceRoll <= 50) {
        serviceType = serviceTypeCN
        typeInfo = cnTypeInfo
      } else {
        serviceType = serviceTypeDP
        typeInfo = dpTypeInfo
      }
      if (!typeInfo) throw new Error('Undefined type information')

      // Randomly generate an amount between min/max bounds
      // TODO: RE-Enable this
      amount = randAmount(typeInfo.minStake, typeInfo.maxStake)
      if (amount.lt(typeInfo.minStake)) {
        testLog(
          user,
          `addNewService - generated invalid stake amount: ${amount}, setting to ${typeInfo.minStake}`
        )
        amount = typeInfo.minStake
      }

      // amount = (typeInfo.minStake.add(_lib.toBN(rand(0, 100000)))) // Min + random amount up to 100k WEI
      testLog(
        user,
        `${serviceTypeDiceRoll}% roll - adding ${web3.utils.hexToUtf8(
          serviceType
        )} - ${amount.toString()} audwei `
      )
      let currentBalance = await token.balanceOf(user)
      if (amount.gt(currentBalance)) {
        let missing = amount.sub(currentBalance)
        await token.transfer(user, missing, { from: proxyDeployerAddress })
        currentBalance = await token.balanceOf(user)
      }

      let serviceEndpoint = makeDummyEndpoint(
        user,
        web3.utils.hexToUtf8(serviceType)
      )
      testLog(
        user,
        `adding endpoint=${serviceEndpoint} - amt=${amount.toString()}`
      )
      await _lib.registerServiceProvider(
        token,
        staking,
        serviceProviderFactory,
        serviceType,
        serviceEndpoint,
        amount,
        user
      )
      // Confirm system is internally consistent for this user
      await validateAccountStakeBalance(user)
      totalDeployerStaked = totalDeployerStaked.add(amount)
    } catch (e) {
      testLog(user, `Error registering service provider. ${e}`)
    }
  }

  const delegate = async (serviceProvider, amount, delegator) => {
    try {
      let currentBalance = await token.balanceOf(delegator)
      if (amount.gt(currentBalance)) {
        let missing = amount.sub(currentBalance)
        await token.transfer(delegator, missing, { from: proxyDeployerAddress })
        currentBalance = await token.balanceOf(delegator)
      }
      // Approve staking transfer
      await token.approve(staking.address, amount, { from: delegator })
      // Delegate valid min to SP 1
      await delegateManager.delegateStake(serviceProvider, amount, {
        from: delegator
      })
      // Increment test statistics
      numDelegateOperations = numDelegateOperations.add(_lib.toBN(1))
      totalDelegatedAmount = totalDelegatedAmount.add(amount)
      testLog(delegator, `Delegated ${amount} to TargetSP=${serviceProvider}`)
    } catch (e) {
      testLog(
        delegator,
        `Error delegating ${amount} from ${delegator} to ${serviceProvider}. ${e}`
      )
    }
  }

  const randomlySlash = async () => {
    let slashPercent = 50
    let slashDiceRoll = rand(0, 100)
    let shouldSlash = slashDiceRoll < slashPercent
    sysLog(
      `Slash rolled ${slashDiceRoll}, probability=${slashPercent}%, shouldSlash=${shouldSlash}`
    )
    if (!shouldSlash) return

    let randSlashTarget = users[Math.floor(Math.random() * users.length)]
    let targetInfo = await getAccountStakeInfo(randSlashTarget)
    let totalStakeForSlashTarget = targetInfo.totalInStakingContract
    if (totalStakeForSlashTarget.eq(_lib.toBN(0))) {
      testLog(
        randSlashTarget,
        `randomlySlash - No stake found for user ${randSlashTarget}`
      )
    }
    // Dice roll to slash ALL or portion
    // 10% chance of slashing ALL stake
    let shouldSlashAll = rand(0, 100) > 90
    let slashAmount
    testLog(
      randSlashTarget,
      `Random slash ${randSlashTarget} has ${totalStakeForSlashTarget} tokens, shouldSlashAll=${shouldSlashAll}`
    )
    if (shouldSlashAll) {
      slashAmount = totalStakeForSlashTarget
    } else {
      // Slash between 1/10 and 1/2 of stake
      slashAmount = randAmount(
        totalStakeForSlashTarget.div(_lib.toBN(10)),
        totalStakeForSlashTarget.div(_lib.toBN(2))
      )
    }
    testLog(
      randSlashTarget,
      `Randomly slashing ${randSlashTarget} ${slashAmount} tokens`
    )
    try {
      await _lib.slash(
        slashAmount.toString(),
        randSlashTarget,
        governance,
        delegateManagerKey,
        guardianAddress
      )
    } catch (e) {
      console.log(e)
    }
    numSlashOperations = numSlashOperations.add(_lib.toBN(1))
    totalSlashedAmount = totalSlashedAmount.add(slashAmount)
    testLog(
      randSlashTarget,
      `Randomly slashed ${randSlashTarget} ${slashAmount}`
    )
  }

  const randomlyDelegate = async (user) => {
    // 50% chance of delegation FROM this user
    let shouldDelegate = rand(0, 100)
    if (shouldDelegate < 50) return
    let otherUsers = users.filter((x) => x != user)
    let randTargetUser =
      otherUsers[Math.floor(Math.random() * otherUsers.length)]
    let targetInfo = await getAccountStakeInfo(randTargetUser)
    let targetMax = targetInfo.spDetails.maxAccountStake
    let current = targetInfo.totalInStakingContract
    if (!targetInfo.spDetails.validBounds) {
      testLog(
        user,
        `randomlyDelegate: target ${randTargetUser} out of bounds. current=${current}, max=${targetMax}`
      )
      return
    }
    let maxDelAmount = targetMax.sub(current)
    // Select between 100 and 500 AUD to delegate
    let amount = _lib.toBN(rand(100000000000000000000, 500000000000000000000))
    testLog(
      user,
      `randomlyDelegate: maxDelAmt=${maxDelAmount}, targetMax=${targetMax}, current=${current}, selected=${amount}`
    )
    await delegate(randTargetUser, amount, user)
  }

  const randomlyUndelegate = async (user) => {
    let shouldUndelegate = rand(0, 100)
    if (shouldUndelegate < 50) return
    let pendingUndelegateReq =
      await delegateManager.getPendingUndelegateRequest(user, { from: user })
    let isRequestPending = !pendingUndelegateReq.lockupExpiryBlock.eq(
      _lib.toBN(0)
    )
    let otherUsers = users.filter((x) => x != user)
    // key = sp address
    // value = amount delegated by 'user' specified in function arg
    let delegatorInformation = {}
    let validDelegator = false
    await Promise.all(
      otherUsers.map(async (otherSpAddress) => {
        let delStakeForOtherSp =
          await delegateManager.getDelegatorStakeForServiceProvider(
            user,
            otherSpAddress
          )
        // testLog(user, `randomlyUndelegate: otherSP: ${otherSpAddress} delStakeForOtherSp=${delStakeForOtherSp}`)
        if (!delStakeForOtherSp.gt(_lib.toBN(0))) return
        delegatorInformation[otherSpAddress] = delStakeForOtherSp
        validDelegator = true
      })
    )
    if (isRequestPending) {
      let lockupExpiryBlock = pendingUndelegateReq.lockupExpiryBlock
      let latestBlock = _lib.toBN((await web3.eth.getBlock('latest')).number)
      let readyToEvaluate = lockupExpiryBlock.lte(latestBlock)
      testLog(
        user,
        `randomlyUndelegate: isRequestPending=${isRequestPending}, lockupExpiryBlock=${lockupExpiryBlock}, readyToEvaluate=${readyToEvaluate}`
      )
      if (readyToEvaluate) {
        let tokenBalBeforeUndel = await token.balanceOf(user)
        await delegateManager.undelegateStake({ from: user })
        let tokenBalAfterUndel = await token.balanceOf(user)
        let numTokens = tokenBalAfterUndel.sub(tokenBalBeforeUndel)
        testLog(
          user,
          `randomlyUndelegate: Complete! Undelegated ${numTokens} tokens`
        )
      }
    } else if (validDelegator) {
      // testLog(user, `randomlyUndelegate: validDelegator: ${validDelegator} isRequestPending=${isRequestPending}`)
      let undelegateTargetSP = Object.keys(delegatorInformation)
      let randomlySelectedUndelegateTarget =
        undelegateTargetSP[
        Math.floor(Math.random() * undelegateTargetSP.length)
        ]
      // TMP Remove all stake
      // TODO: randomize this quantity as well
      let undelegateAmount =
        delegatorInformation[randomlySelectedUndelegateTarget]
      testLog(
        user,
        `randomlyUndelegate: requesting target=${randomlySelectedUndelegateTarget}, amount=${delegatorInformation[randomlySelectedUndelegateTarget]}`
      )
      await delegateManager.requestUndelegateStake(
        randomlySelectedUndelegateTarget,
        undelegateAmount,
        { from: user }
      )
      testLog(
        user,
        `randomlyUndelegate: request submitted. target=${randomlySelectedUndelegateTarget}, undelegateAmount=${undelegateAmount}`
      )
    }
  }

  const removeRandomDelegator = async (user) => {
    testLog(user, `removeRandomDelegator - deciding which delegator to kick`)
    let delegatorsList = await delegateManager.getDelegatorsList(user, {
      from: user
    })
    testLog(user, `Selecting from: ${delegatorsList}`)
    let randomlyBootedDelegator =
      delegatorsList[Math.floor(Math.random() * delegatorsList.length)]
    testLog(user, `Randomly booting: ${randomlyBootedDelegator}`)
    await delegateManager.requestRemoveDelegator(
      user,
      randomlyBootedDelegator,
      { from: user }
    )
    let removeReqExpiryBlock =
      await delegateManager.getPendingRemoveDelegatorRequest(
        user,
        randomlyBootedDelegator
      )
    let currentBlock = await getLatestBlock()
    testLog(
      user,
      `Delegator removal of ${randomlyBootedDelegator}, expiryBlock=${removeReqExpiryBlock}, currentBlock=${currentBlock}...advancing blocks`
    )
    await advanceBlockTo(removeReqExpiryBlock)
    await delegateManager.removeDelegator(user, randomlyBootedDelegator, {
      from: user
    })
    testLog(user, `Delegator ${randomlyBootedDelegator} removed!`)
    numRemoveDelegatorOps = numRemoveDelegatorOps.add(_lib.toBN(1))
  }

  const randomlyDecreaseStake = async (user) => {
    let userInfo = await getAccountStakeInfo(user)
    let pendingDecreaseReq =
      await serviceProviderFactory.getPendingDecreaseStakeRequest(user)
    let isRequestPending = !pendingDecreaseReq.lockupExpiryBlock.eq(
      _lib.toBN(0)
    )
    let currentMaxForAcct = userInfo.spDetails.maxAccountStake
    let currentMinForAcct = userInfo.spDetails.minAccountStake
    let currentForDeployer = userInfo.spDetails.deployerStake
    // let targetAmount = rand(currentMinForAcct.toNumber(), currentMaxForAcct.toNumber())
    // Decrease to the minimum bound
    let decreaseAmount = currentForDeployer.sub(currentMinForAcct)
    try {
      // If no request is pending and we are out of bounds, submit a decrease request
      if (!isRequestPending && !userInfo.spDetails.validBounds) {
        let totalAfterDecrease =
          userInfo.totalInStakingContract.sub(decreaseAmount)
        // Determine whether this SP is able to decrease their own stake into a valid state
        // If not, randomly decrease delegators
        let decreaseToValidBounds =
          totalAfterDecrease.gte(currentMinForAcct) &&
          totalAfterDecrease.lte(currentMaxForAcct)
        testLog(
          user,
          `randomlyDecreaseStake, validBounds: ${userInfo.spDetails.validBounds}, max: ${currentMaxForAcct}, deployer: ${currentForDeployer}, staking=${userInfo.totalInStakingContract}, decreasing by ${decreaseAmount}, totalAfterDecrease=${totalAfterDecrease}, decreaseToValidBounds=${decreaseToValidBounds}`
        )
        // If decreaseToValidBounds === false, KICK OFF DELEGATOR
        if (!decreaseToValidBounds) {
          // Initiate removal of delegator
          await removeRandomDelegator(user)
        } else {
          await serviceProviderFactory.requestDecreaseStake(decreaseAmount, {
            from: user
          })
        }
      } else if (isRequestPending) {
        let latestBlock = _lib.toBN((await web3.eth.getBlock('latest')).number)
        let readyToEvaluate =
          pendingDecreaseReq.lockupExpiryBlock.lte(latestBlock)
        if (readyToEvaluate) {
          await serviceProviderFactory.decreaseStake({ from: user })
          numDecreaseStakeOperations = numDecreaseStakeOperations.add(
            _lib.toBN(1)
          )
          testLog(
            user,
            `randomlyDecreaseStake request evaluated | lockupExpiryBlock: ${pendingDecreaseReq.lockupExpiryBlock}, latest=${latestBlock}, numDecreaseStakeOperations=${numDecreaseStakeOperations}`
          )
        }
      } else {
        // TODO: ENABLE RANDOMNESS
        //       Should randomly issue a decrease request tow ithin bounds
        // let shouldDecrease = rand(0, 100)
        // if (shouldDecrease < 50) return
      }
    } catch (e) {
      testLog(
        user,
        `Error decreasing stake by ${decreaseAmount} for ${user} ${e}`
      )
    }
  }

  const updateDeployerCut = async (user) => {
    let info = await getAccountStakeInfo(user)
    let pendingUpdateDeployerCutReq =
      await serviceProviderFactory.getPendingUpdateDeployerCutRequest(user, {
        from: user
      })
    let isRequestPending = !pendingUpdateDeployerCutReq.lockupExpiryBlock.eq(
      _lib.toBN(0)
    )
    if (!info.spDetails.deployerCut.eq(_lib.toBN(0))) {
      // TODO: Random probability of update
      // testLog(user, `updateDeployerCut already set to ${info.spDetails.deployerCut}`)
      return
    }
    if (!isRequestPending) {
      let newCut = rand(0, 99)
      testLog(
        user,
        ` updateDeployerCut to ${newCut} isRequestPending=${isRequestPending}`
      )
      await serviceProviderFactory.requestUpdateDeployerCut(user, newCut, {
        from: user
      })
    } else {
      let latestBlock = _lib.toBN((await web3.eth.getBlock('latest')).number)
      let readyToEvaluate =
        pendingUpdateDeployerCutReq.lockupExpiryBlock.lte(latestBlock)
      if (readyToEvaluate) {
        await serviceProviderFactory.updateDeployerCut(user, { from: user })
        testLog(
          user,
          `updateDeployerCut evaluating pending request, newCut=${pendingUpdateDeployerCutReq.newDeployerCut}`
        )
      }
    }
  }

  const getAccountStakeInfo = async (account) => {
    let spDetails = await serviceProviderFactory.getServiceProviderDetails(
      account
    )
    let totalInStakingContract = await staking.totalStakedFor(account)
    let totalDelegatedToSP =
      await delegateManager.getTotalDelegatedToServiceProvider(account)
    let outsideStake = spDetails.deployerStake.add(totalDelegatedToSP)
    return {
      totalInStakingContract,
      totalDelegatedToSP,
      outsideStake,
      spDetails,
      account
    }
  }

  const validateAccountStakeBalance = async (account) => {
    let info = await getAccountStakeInfo(account)
    let infoStr = `validation |\
inStaking=${info.totalInStakingContract.toString()}, deployerCut=${info.spDetails.deployerCut
      } validBounds=${info.spDetails.validBounds} \
outside=${info.outsideStake.toString()}=(deployerStake=${info.spDetails.deployerStake
      } delegation=${info.totalDelegatedToSP}), `
    assert.isTrue(
      info.totalInStakingContract.eq(info.outsideStake),
      `Imbalanced stake for account ${account} - ${infoStr}`
    )
    testLog(account, infoStr)
    return info
  }

  const validateUsers = async (users) => {
    sysLog(`------- Validating User State -------`)
    await Promise.all(
      users.map(async (user) => {
        let info = await validateAccountStakeBalance(user)
        // If out of bounds, transfer minimum stake
        // let withinBounds = info.spDetails.withinBounds
        let lowerBoundViolated = info.totalInStakingContract.lt(
          info.spDetails.minAccountStake
        )
        if (lowerBoundViolated) {
          let increaseAmount = await info.spDetails.minAccountStake
          testLog(user, `Increasing stake by ${increaseAmount}`)
          await token.transfer(user, increaseAmount, {
            from: proxyDeployerAddress
          })
          await token.approve(staking.address, increaseAmount, { from: user })
          await serviceProviderFactory.increaseStake(increaseAmount, {
            from: user
          })
        }
      })
    )
    sysLog(`------- Finished Validating User State -------`)
  }

  // Lower probability of claim to <100% but still high
  const claimPendingRewards = async (users) => {
    sysLog(`------- Claiming Rewards -------`)
    let lastFundedBlock = await claimsManager.getLastFundedBlock()
    let totalAtFundBlock = await staking.totalStakedAt(lastFundedBlock)
    let fundsPerRound = await claimsManager.getFundsPerRound()
    sysLog(
      `Round INFO lastFundBlock=${lastFundedBlock} - totalAtFundBlock=${totalAtFundBlock} - fundsPerRound=${fundsPerRound}`
    )
    // TODO: Randomize whether or not a claim is performed
    await Promise.all(
      users.map(async (user) => {
        let preClaimInfo = await getAccountStakeInfo(user)
        let totalForUserAtFundBlock = await staking.totalStakedForAt(
          user,
          lastFundedBlock
        )
        try {
          let tx = await delegateManager.claimRewards(user, { from: user })
          let postClaimInfo = await getAccountStakeInfo(user)
          let rewards = postClaimInfo.totalInStakingContract.sub(
            preClaimInfo.totalInStakingContract
          )
          testLog(
            user,
            `Claimed ${rewards}, totalForUserAtFundBlock=${totalForUserAtFundBlock} - validBounds==${preClaimInfo.spDetails.validBounds}`
          )
          totalClaimedRewards = totalClaimedRewards.add(rewards)
        } catch (e) {
          console.log(e)
        }
      })
    )
    sysLog(`------- Finished Claiming Rewards -------`)
  }

  const advanceBlockTo = async (blockNumber) => {
    try {
      await time.advanceBlockTo(blockNumber)
    } catch (e) {
      sysLog(`Caught ${e} advancing blocks`)
    }
  }

  const initiateRound = async (user) => {
    sysLog(`------- Initiating Round -------`)
    let lastFundedBlock = await claimsManager.getLastFundedBlock()
    sysLog(`lastFundedBlock: ${lastFundedBlock.toString()}`)
    let fundingRoundDiff = await claimsManager.getFundingRoundBlockDiff()
    sysLog(`fundingRoundDiff: ${fundingRoundDiff.toString()}`)
    let nextFundingRoundBlock = lastFundedBlock.add(fundingRoundDiff)
    sysLog(`nextFundingRoundBlock: ${nextFundingRoundBlock.toString()}`)
    let latestBlock = await web3.eth.getBlock('latest')
    if (nextFundingRoundBlock.gte(_lib.toBN(latestBlock.number))) {
      await advanceBlockTo(nextFundingRoundBlock.add(_lib.toBN(1)))
    }
    sysLog(`latestBlock: ${latestBlock.number.toString()}`)
    await claimsManager.initiateRound({ from: user })
  }

  // After every single action, randomly decide to advance a random number of blocks
  const randomlyAdvanceBlocks = async () => {
    // 50% of randomly advancing blocks
    let shouldRandomlyAdvance = rand(0, 100)
    if (shouldRandomlyAdvance < 50) return
    // Randomly generate num blocks between 1 and 10
    let numBlocks = _lib.toBN(rand(1, 10))
    let latestBlock = await web3.eth.getBlock('latest')
    let latestBlockNumber = _lib.toBN(latestBlock.number)
    let targetBlockNumber = latestBlockNumber.add(numBlocks)
    sysLog(
      `Randomly advancing ${numBlocks} blocks from ${latestBlockNumber} to ${targetBlockNumber}, ${shouldRandomlyAdvance}/100`
    )
    await advanceBlockTo(targetBlockNumber)
    latestBlock = await web3.eth.getBlock('latest')
    latestBlockNumber = _lib.toBN(latestBlock.number)
  }

  // Add services as expected
  const processUserState = async (users) => {
    await Promise.all(
      users.map(async (user) => {
        let userServiceInfo = await getUserServiceInfo(user)
        if (userServiceInfo.numServices < minNumServicesPerUser) {
          // In this case, our user has not yet registered
          await addNewServiceForUser(user)
        } else {
          await updateDeployerCut(user)
          await randomlyDelegate(user)
          await randomlyDecreaseStake(user)
          await randomlyUndelegate(user)
        }
      })
    )
  }

  it('Random test suite', async () => {
    let startTime = Date.now()
    let duration = Date.now() - startTime
    await logCurrentBlock()
    while (duration < TestDuration) {
      let roundStart = Date.now()
      sysLog(
        `------------------------ AUDIUS RANDOM TESTING - Round ${currentRound}, ${duration}/${TestDuration}ms ------------------------`
      )
      // Ensure base user state (service requirements satisfied)
      await processUserState(users)
      await randomlyAdvanceBlocks()

      // TODO: Randomize from which acct the round is initiated
      await initiateRound(users[0])

      await randomlySlash()

      await randomlyAdvanceBlocks()
      await claimPendingRewards(users)

      await randomlyAdvanceBlocks()
      await validateUsers(users)

      await randomlyAdvanceBlocks()
      let roundDuration = Date.now() - roundStart
      sysLog(
        `------------------------ AUDIUS RANDOM TESTING - Finished Round ${currentRound} in ${roundDuration}ms ------------------------\n`
      )
      // Progress round
      currentRound++
      // Update duration
      duration = Date.now() - startTime
      await logCurrentBlock()
    }
    await logCurrentBlock()
    sysLog(
      `------------------------ AUDIUS RANDOM TESTING SUMMARY - Finished ${currentRound} rounds in ${duration}ms ------------------------`
    )
    printUserTestSummary()
    printTestSummary()
  })
})
