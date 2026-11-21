const assert = require('assert')
const sinon = require('sinon')
const {
  AttestationPhases,
  SubmitAndEvaluateError
} = require('../src/api/Rewards')
const {
  RewardsAttester,
  AttestationDelayCalculator
} = require('../src/services/solana/rewardsAttester')
const { Utils } = require('../src/utils')
const { encodeHashId } = Utils

function MockLibs(getSlot = () => 100, getBlockNumber = () => 100) {
  this.getSlot = getSlot
  this.getBlockNumber = getBlockNumber
  this.solanaWeb3Manager = {
    getSlot: () => this.getSlot(),
    hasBalance: ({ publicKey }) => true
  }
  this.web3Manager = {
    getWeb3: () => ({
      eth: {
        getBlockNumber: () => this.getBlockNumber()
      }
    })
  }
  this.Rewards = {
    submitAndEvaluate: (args) => {},
    getUndisbursedChallenges: (args) => {},
    ServiceProvider: {
      getUniquelyOwnedDiscoveryNodes: ({ quorumSize, discoveryNodes }) => {
        return discoveryNodes.slice(0, quorumSize)
      }
    }
  }
  this.discoveryProvider = {
    serviceSelector: {
      findAll: ({ whitelist }) => {
        return whitelist
      }
    }
  }
}

let calc = null

describe('Delay calculator tests', () => {
  afterEach(async () => {
    calc.stop()
  })

  it('Should get Slot and block threshold on fresh start', async () => {
    calc = new AttestationDelayCalculator({
      libs: new MockLibs(
        () => 100,
        () => 100
      ),
      runBehindSec: 5,
      allowedStalenessSec: 1
    })
    await calc.start()
    const slotThreshold = await calc.getSolanaSlotThreshold()
    assert.strictEqual(slotThreshold, 90)

    const blockThreshold = await calc.getPOABlockThreshold()
    assert.strictEqual(blockThreshold, 99)
  })

  it('Should cache slot and block values', async () => {
    const libs = new MockLibs(
      () => 100,
      () => 100
    )
    calc = new AttestationDelayCalculator({
      libs,
      runBehindSec: 5,
      allowedStalenessSec: 1
    })
    await calc.start()
    await calc.getSolanaSlotThreshold()
    await calc.getPOABlockThreshold()

    libs.getSlot = () => 110
    libs.getBlockNumber = () => 110
    const slotThreshold = await calc.getSolanaSlotThreshold()
    assert.strictEqual(slotThreshold, 90)
    const blockThreshold = await calc.getPOABlockThreshold()
    assert.strictEqual(blockThreshold, 99)
  })

  it('Should get new values after the cache expires', async () => {
    const libs = new MockLibs(
      () => 100,
      () => 100
    )
    calc = new AttestationDelayCalculator({
      libs,
      runBehindSec: 5,
      allowedStalenessSec: 1
    })
    await calc.start()
    await calc.getSolanaSlotThreshold()
    await calc.getPOABlockThreshold()

    await new Promise((res) => setTimeout(res, 1100))
    libs.getSlot = () => 110
    libs.getBlockNumber = () => 110
    const slotThreshold = await calc.getSolanaSlotThreshold()
    assert.strictEqual(slotThreshold, 100)
    const blockThreshold = await calc.getPOABlockThreshold()
    assert.strictEqual(blockThreshold, 109)
  })

  it('Should update the solana slot properly', async () => {
    const solSlot = {
      last: 100
    }
    const i = setInterval(() => {
      solSlot.last += 1
    }, 230)

    const libs = new MockLibs(
      () => solSlot.last,
      () => 100
    )

    calc = new AttestationDelayCalculator({
      libs,
      runBehindSec: 5,
      allowedStalenessSec: 1,
      solanaPollingInterval: 0.5
    })
    calc.start()
    const slotThreshold1 = await calc.getSolanaSlotThreshold()
    assert.strictEqual(slotThreshold1, 90)

    await new Promise((res) => setTimeout(res, 1100))
    const slotThreshold2 = await calc.getSolanaSlotThreshold()
    assert.strictEqual(slotThreshold2, 84)

    clearInterval(i)
  })
})

describe('Rewards Attester Tests', () => {
  afterEach(async () => {
    sinon.restore()
  })

  it('Should handle happy path attestation loop', async () => {
    const libs = new MockLibs()

    const attester = new RewardsAttester({
      libs,
      startingBlock: 0,
      offset: 0,
      parallelization: 2,
      quorumSize: 2,
      aaoEndpoint: 'https://fakeaao.co',
      aaoAddress: '0xFakeOracle',
      challengeIdsDenyList: [],
      endpoints: ['https://dn1.co', 'https://dn2.co', 'https://dn3.co'],
      isSolanaChallenge: () => false,
      feePayerOverride: 'test feepayer override'
    })

    const rewardsMock = sinon.mock(libs.Rewards)

    rewardsMock
      .expects('getUndisbursedChallenges')
      .exactly(3)
      .onFirstCall()
      .returns(withSuccess([1, 2].map((i) => makeChallenge(i, i))))
      .onSecondCall()
      .returns(withSuccess([3, 4].map((i) => makeChallenge(i, i))))
      .onThirdCall()
      .callsFake(() => {
        attester.stop()
        return {
          success: []
        }
      })

    rewardsMock
      .expects('submitAndEvaluate')
      .exactly(4)
      .returns({ success: true })

    await attester.start()
    assert.equal(attester.startingBlock, 3)
    assert.equal(attester.offset, 0)
    rewardsMock.verify()
  })

  it('Sets offset correctly for unretryable errors with same starting block', async () => {
    const libs = new MockLibs()
    const rewardsStub = sinon.stub(libs.Rewards)

    const attester = new RewardsAttester({
      libs,
      startingBlock: 0,
      offset: 0,
      parallelization: 2,
      quorumSize: 2,
      aaoEndpoint: 'https://fakeaao.co',
      aaoAddress: '0xFakeOracle',
      challengeIdsDenyList: [],
      endpoints: ['https://dn1.co', 'https://dn2.co', 'https://dn3.co'],
      isSolanaChallenge: () => false,
      feePayerOverride: 'test feepayer override'
    })

    const [attesterPromise, resolve] = makeAttesterPromise()

    rewardsStub.getUndisbursedChallenges
      .onFirstCall()
      .returns(withSuccess([0, 1].map((i) => makeChallenge(i, 1))))
      .onSecondCall()
      .returns(withSuccess([2, 3].map((i) => makeChallenge(i, 1))))
      .onThirdCall()
      .callsFake(() => {
        attester.stop()
        resolve()
        return withSuccess([])
      })

    rewardsStub.submitAndEvaluate
      .withArgs(sinon.match({ specifier: sinon.match.in([0, 1, 2, 3]) }))
      .returns({
        success: false,
        error: SubmitAndEvaluateError.AAO_ATTESTATION_REJECTION,
        phase: AttestationPhases.AGGREGATE_ATTESTATIONS
      })

    await attester.start()
    await attesterPromise

    assert.equal(attester.startingBlock, 0)
    assert.equal(attester.offset, 4)
  })

  it('Sets offset correctly for unretryable errors with different starting block', async () => {
    const libs = new MockLibs()
    const rewardsStub = sinon.stub(libs.Rewards)

    const attester = new RewardsAttester({
      libs,
      startingBlock: 0,
      offset: 0,
      parallelization: 2,
      quorumSize: 2,
      aaoEndpoint: 'https://fakeaao.co',
      aaoAddress: '0xFakeOracle',
      challengeIdsDenyList: [],
      endpoints: ['https://dn1.co', 'https://dn2.co', 'https://dn3.co'],
      isSolanaChallenge: () => false,
      feePayerOverride: 'test feepayer override'
    })

    const [attesterPromise, resolve] = makeAttesterPromise()

    rewardsStub.getUndisbursedChallenges
      .onFirstCall()
      .returns(withSuccess([0, 1].map((i) => makeChallenge(i, 1))))
      .onSecondCall()
      .returns(withSuccess([2, 3].map((i) => makeChallenge(i, 2))))
      .onThirdCall()
      .callsFake(() => {
        attester.stop()
        resolve()
        return withSuccess([])
      })

    rewardsStub.submitAndEvaluate
      .withArgs(sinon.match({ specifier: sinon.match.in([0, 1, 2, 3]) }))
      .returns({
        success: false,
        error: SubmitAndEvaluateError.AAO_ATTESTATION_REJECTION,
        phase: AttestationPhases.AGGREGATE_ATTESTATIONS
      })

    await attester.start()
    await attesterPromise

    assert.equal(attester.startingBlock, 1)
    assert.equal(attester.offset, 2)
  })

  it('Handles errors in processChallenges after retrying', async () => {
    const libs = new MockLibs()
    const rewardsMock = sinon.mock(libs.Rewards)

    const attester = new RewardsAttester({
      libs,
      startingBlock: 0,
      offset: 0,
      parallelization: 2,
      quorumSize: 2,
      aaoEndpoint: 'https://fakeaao.co',
      aaoAddress: '0xFakeOracle',
      challengeIdsDenyList: [],
      endpoints: ['https://dn1.co', 'https://dn2.co', 'https://dn3.co'],
      isSolanaChallenge: () => false,
      feePayerOverride: 'test feepayer override',
      maxCooldownMsec: 100
    })

    rewardsMock.expects('submitAndEvaluate').exactly(5).returns({
      success: false,
      error: SubmitAndEvaluateError.CHALLENGE_INCOMPLETE,
      phase: AttestationPhases.AGGREGATE_ATTESTATIONS
    })

    const { errors } = await attester.processChallenges([
      {
        challengeId: 'p',
        userId: encodeHashId(1),
        specifier: '1',
        amount: '1',
        completedBlocknumber: 1,
        handle: 'user_1',
        wallet: '0x1'
      }
    ])

    assert.equal(errors?.length, 1)
  })
})

const makeAttesterPromise = () => {
  let res = null
  const promise = new Promise((resolve) => (res = resolve))
  return [promise, res]
}

const withSuccess = (objs) => ({
  success: objs
})

const makeChallenge = (index, completedBlocknumber) => ({
  challenge_id: 'p',
  user_id: encodeHashId(index),
  specifier: index,
  amount: '1',
  completed_blocknumber: completedBlocknumber,
  handle: `user_ ${index}`,
  wallet: `0x${index}`
})
