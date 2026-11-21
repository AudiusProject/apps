const assert = require('assert')
const sinon = require('sinon')

const config = require('../src/config')
const { generateWalletLockKey } = require('../src/relay/txRelay')
const { Lock } = require('../src/redis')

describe('test txRelay: selectWallet()', async () => {
  let relayerWallets, selectWallet
  beforeEach(async () => {
    delete require.cache[require.resolve('../src/relay/txRelay')]
    delete require.cache[require.resolve('../src/web3')]

    relayerWallets = [
      {
        publicKey: 'publicKey1',
        privateKey: 'privateKey1'
      },
      {
        publicKey: 'publicKey2',
        privateKey: 'privateKey2'
      }
    ]
    sinon.stub(config, 'get').withArgs('relayerWallets').returns(relayerWallets)
    selectWallet = require('../src/relay/txRelay').selectWallet

    await Lock.clearAllLocks('*')
  })

  afterEach(async () => {
    delete require.cache[require.resolve('../src/relay/txRelay')]
    delete require.cache[require.resolve('../src/web3')]
    sinon.restore()
  })

  it('should select a random wallet', async () => {
    const firstWallet = await selectWallet()
    const secondWallet = await selectWallet()

    console.log('firstWallet', firstWallet)
    console.log('secondWallet', secondWallet)
    assert(firstWallet.publicKey !== secondWallet.publicKey)
    assert(firstWallet.privateKey !== secondWallet.privateKey)
  })

  it('should return null when attempting to select a wallet when all are in use', async () => {
    let i = 0
    let nullWallet
    while (i++ < 3) {
      nullWallet = await selectWallet()
    }

    assert(nullWallet === undefined)
  })

  it('should return an unlocked wallet when all wallets are reset to unlocked', async () => {
    const firstWallet = await selectWallet()
    const secondWallet = await selectWallet()

    await Lock.clearLock(generateWalletLockKey(firstWallet.publicKey))
    await Lock.clearLock(generateWalletLockKey(secondWallet.publicKey))

    const thirdWallet = await selectWallet()
    assert(thirdWallet !== undefined)
  })
})
