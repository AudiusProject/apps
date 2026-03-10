const request = require('supertest')
const assert = require('assert')

const { getApp } = require('./lib/app')
const models = require('../src/models')

describe('test authentication routes', function () {
  let app, server
  beforeEach(async () => {
    const appInfo = await getApp()
    app = appInfo.app
    server = appInfo.server
    await app.get('redis').flushdb()
  })
  afterEach(async () => {
    await server.close()
  })

  async function signUpUser({
    iv = 'a7407b91ccb1a09a270e79296c88a990',
    cipherText = '00b1684fe58f95ef7bca1442681a61b8aa817a136d3c932dcee2bdcb59454205b73174e71b39fa1d532ee915b6d4ba24e8487603fa63e738de35d3505085a142',
    lookupKey = '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
    username = 'dheeraj@audius.co',
    walletAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaa',
    associateWallet = false
  } = {}) {
    await request(app).post('/authentication').send({
      iv,
      cipherText,
      lookupKey
    })

    await request(app).post('/user').send({
      username,
      walletAddress
    })

    const authModel = await models.Authentication.findOne({
      where: { lookupKey }
    })
    const userModel = await models.User.findOne({ where: { walletAddress } })

    assert.strictEqual(authModel.walletAddress, null)

    if (associateWallet) {
      await request(app)
        .get('/authentication')
        .query({
          lookupKey,
          username
        })
        .expect(403)

      const redis = app.get('redis')
      const otp = await redis.get(`otp:${username}`)

      await request(app)
        .get('/authentication')
        .query({
          lookupKey,
          username,
          otp
        })
        .expect(200)

      const updatedAuthRecord = await models.Authentication.findOne({
        where: { lookupKey }
      })
      assert.strictEqual(updatedAuthRecord.walletAddress, walletAddress)

      const updatedUserRecord = await models.User.findOne({
        where: { walletAddress }
      })
      assert.strictEqual(updatedUserRecord.email, username)

      return [updatedAuthRecord, updatedUserRecord]
    }

    return [authModel, userModel]
  }

  async function getUser({ lookupKey, walletAddress } = {}) {
    const authModel = await models.Authentication.findOne({
      where: { lookupKey }
    })
    const userModel = await models.User.findOne({ where: { walletAddress } })
    return [authModel, userModel]
  }

  it('responds 400 for sign up with incorrect body', function (done) {
    request(app)
      .post('/authentication')
      .send({
        iv: 'a7407b91ccb1a09a270e79296c88a990',
        cipherText:
          '00b1684fe58f95ef7bca1442681a61b8aa817a136d3c932dcee2bdcb59454205b73174e71b39fa1d532ee915b6d4ba24e8487603fa63e738de35d3505085a142'
      })
      .expect(400, done)
  })

  it('responds 200 for sign up with correct body', function (done) {
    request(app)
      .post('/authentication')
      .send({
        iv: 'a7407b91ccb1a09a270e79296c88a990',
        cipherText:
          '00b1684fe58f95ef7bca1442681a61b8aa817a136d3c932dcee2bdcb59454205b73174e71b39fa1d532ee915b6d4ba24e8487603fa63e738de35d3505085a142',
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77'
      })
      .expect(200, done)
  })

  it('changes passwords for the user', async function () {
    await signUpUser()

    await request(app)
      .post('/authentication')
      .send({
        iv: 'b7407b91ccb1a09a270e79296c88a990',
        cipherText:
          '10b1684fe58f95ef7bca1442681a61b8aa817a136d3c932dcee2bdcb59454205b73174e71b39fa1d532ee915b6d4ba24e8487603fa63e738de35d3505085a142',
        lookupKey:
          '1bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        oldLookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77'
      })
      .expect(200)

    const redis = app.get('redis')
    await redis.set('otp:dheeraj@audius.co', '123456')
    // old lookup key doesn't work
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        otp: '123456'
      })
      .expect(400)

    // New lookup key works
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '1bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        otp: '123456'
      })
      .expect(200)

    // Change back
    await request(app)
      .post('/authentication')
      .send({
        iv: 'b7407b91ccb1a09a270e79296c88a990',
        cipherText:
          '10b1684fe58f95ef7bca1442681a61b8aa817a136d3c932dcee2bdcb59454205b73174e71b39fa1d532ee915b6d4ba24e8487603fa63e738de35d3505085a142',
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        oldLookupKey:
          '1bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77'
      })
      .expect(200)

    // old lookup key doesn't work
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '1bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        otp: '123456'
      })
      .expect(400)

    // New lookup key works
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        otp: '123456'
      })
      .expect(200)
  })

  it('responds 400 for lookup authentication with invalid lookupKey', async function () {
    // Try getting data without the correct query params, should fail
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        otp: '123456'
      })
      .expect(400, { error: 'Invalid credentials' })
  })

  it('responds 200 for lookup authentication with correct params', async function () {
    await signUpUser()

    const redis = app.get('redis')
    await redis.set('otp:dheeraj@audius.co', '123456')
    // Try getting data with the right params
    const response = await request(app).get('/authentication').query({
      lookupKey:
        '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
      username: 'dheeraj@audius.co',
      otp: '123456'
    })

    assert.deepStrictEqual(response.statusCode, 200)
  })

  it('sends otp code to authenticating users', async function () {
    await signUpUser()

    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co'
      })
      .expect(403, { error: 'Missing otp' })

    const redis = app.get('redis')
    const otp = await redis.get('otp:dheeraj@audius.co')

    assert.ok(otp)
  })

  it('is case-insensitive for OTP code checks', async function () {
    await signUpUser()

    const redis = app.get('redis')
    await redis.set('otp:dheeraj@audius.co', '123456')
    // Try getting data with the right params
    const response = await request(app).get('/authentication').query({
      lookupKey:
        '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
      username: 'DhEeRaj@audius.co',
      otp: '123456'
    })

    assert.deepStrictEqual(response.statusCode, 200)
  })

  it('sends up to 2 otp codes every 10 minutes', async function () {
    const redis = app.get('redis')
    await signUpUser()

    async function requestSignUp() {
      await request(app).get('/authentication').query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co'
      })
    }

    await requestSignUp()
    const otp1 = await redis.get('otp:dheeraj@audius.co')

    await requestSignUp()
    const otp2 = await redis.get('otp:dheeraj@audius.co')
    assert.notStrictEqual(otp1, otp2)

    // After the second request, we don't send any more new otp emails
    await requestSignUp()
    const otp3 = await redis.get('otp:dheeraj@audius.co')
    assert.strictEqual(otp2, otp3)
  })

  it('does not cache otp values when email send fails', async function () {
    const redis = app.get('redis')
    await signUpUser()

    app.set('sendgrid', {
      send: async () => {
        throw new Error('send failed')
      }
    })

    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co'
      })
      .expect(500)

    const otp = await redis.get('otp:dheeraj@audius.co')
    const otpCount = await redis.get('otp:dheeraj@audius.co:count')
    assert.strictEqual(otp, null)
    assert.strictEqual(otpCount, null)
  })

  it('associates user record on sign up', async function () {
    const expectedWalletAddress = '0x1ea101eccdc55a2db6196eff5440ece24ecb55af'
    const iv = 'ebc1d6a0f87fdf108fb42ec6a5bee016'
    const cipherText =
      '771d5472aa8cb0e29626d55939bc7c3a56dd2c9bf5fa279b411a0cc52d8ddbb1052ff4564ee14171c406224bfaf2116304e4c4c46f9e183332c343e4dcf27284'
    const lookupKey =
      '397ae50c24d10abd257dafc5e3b75b78c425ad4a3901bc753acec5aa11cd6536'
    const username = 'test@audius.co'

    await request(app)
      .post('/authentication')
      .set(
        'Encoded-Data-Message',
        'Click sign to authenticate with identity service: 1719845800'
      )
      .set(
        'Encoded-Data-Signature',
        '0x60029425041bdabf5f1805a5c41d889df480670a9db1a69f18e74f83650a490b6b36b17cc36cc9c71c915a451e24dde3657e96e198b29991361fdb8d2d46a4c11c'
      )
      .send({
        iv,
        cipherText,
        lookupKey
      })

    await request(app).post('/user').send({
      username,
      walletAddress: expectedWalletAddress
    })

    const authRecord = await models.Authentication.findOne({
      where: { lookupKey }
    })
    assert.strictEqual(authRecord.walletAddress, expectedWalletAddress)

    const userRecord = await models.User.findOne({
      where: { walletAddress: expectedWalletAddress }
    })
    assert.strictEqual(userRecord.email, username)

    await request(app)
      .get('/authentication')
      .query({
        lookupKey,
        username: 'wrongemail@audius.co'
      })
      .expect(400)

    await authRecord.destroy()
    await userRecord.destroy()
  })

  it('associates user record on sign in', async function () {
    const walletAddress = '0x1ea101eccdc55a2db6196eff5440ece24ecb55af'
    const iv = 'ebc1d6a0f87fdf108fb42ec6a5bee016'
    const cipherText =
      '771d5472aa8cb0e29626d55939bc7c3a56dd2c9bf5fa279b411a0cc52d8ddbb1052ff4564ee14171c406224bfaf2116304e4c4c46f9e183332c343e4dcf27284'
    const lookupKey =
      '397ae50c24d10abd257dafc5e3b75b78c425ad4a3901bc753acec5aa11cd6536'
    const username = 'test@audius.co'

    await request(app).post('/authentication').send({
      iv,
      cipherText,
      lookupKey
    })

    const authRecord = await models.Authentication.findOne({
      where: { lookupKey }
    })
    assert.strictEqual(authRecord.walletAddress, null)

    await request(app).post('/user').send({
      username,
      walletAddress
    })

    await request(app)
      .get('/authentication')
      .query({
        lookupKey,
        username
      })
      .expect(403)

    const redis = app.get('redis')
    let otp = await redis.get(`otp:${username}`)

    await request(app)
      .get('/authentication')
      .query({
        lookupKey,
        username,
        otp
      })
      .expect(200)

    const updatedAuthRecord = await models.Authentication.findOne({
      where: { lookupKey }
    })
    assert.strictEqual(updatedAuthRecord.walletAddress, walletAddress)

    const userRecord = await models.User.findOne({ where: { walletAddress } })
    assert.strictEqual(userRecord.email, username)

    await request(app)
      .get('/authentication')
      .query({
        lookupKey,
        username: 'wrongemail@audius.co'
      })
      .expect(400)

    await request(app)
      .get('/authentication')
      .query({
        lookupKey,
        username
      })
      .expect(403)

    otp = await redis.get(`otp:${username}`)

    await request(app)
      .get('/authentication')
      .query({
        lookupKey,
        username,
        otp
      })
      .expect(200)

    await updatedAuthRecord.destroy()
    await userRecord.destroy()
  })

  it('changes emails for the user', async function () {
    const redis = app.get('redis')

    const iv = 'dbc1d6a0f87fdf108fb42ec6a5bee016'
    const cipherText =
      '371d5472aa8cb0e29626d55939bc7c3a56dd2c9bf5fa279b411a0cc52d8ddbb1052ff4564ee14171c406224bfaf2116304e4c4c46f9e183332c343e4dcf27284'
    const lookupKey =
      '937ae50c24d10abd257dafc5e3b75b78c425ad4a3901bc753acec5aa11cd6536'
    const username = 'test+1@audius.co'
    const walletAddress = '0x1ea101eccdc55a2db6196eff5440ece24ecb55af'

    // create user
    const [authRecord, userRecord] = await signUpUser({
      iv,
      cipherText,
      lookupKey,
      username,
      walletAddress,
      associateWallet: true
    })

    assert.strictEqual(authRecord.walletAddress, userRecord.walletAddress)

    // change email
    const newIv = `${iv}-2`
    const newCipherText = `${cipherText}-2`
    const newLookupKey = `${cipherText}-2`
    const newUsername = 'test+2@audius.co'

    // attempt to trigger OTP with malformed request

    // no signed headers
    await request(app)
      .post('/authentication')
      .send({
        iv: newIv,
        cipherText: newCipherText,
        lookupKey: newLookupKey,
        oldLookupKey: lookupKey,
        email: newUsername
      })
      .expect(400)

    // no new auth artifacts with signed headers
    await request(app)
      .post('/authentication')
      .set(
        'Encoded-Data-Message',
        'Click sign to authenticate with identity service: 1719845800'
      )
      .set(
        'Encoded-Data-Signature',
        '0x60029425041bdabf5f1805a5c41d889df480670a9db1a69f18e74f83650a490b6b36b17cc36cc9c71c915a451e24dde3657e96e198b29991361fdb8d2d46a4c11c'
      )
      .send({
        email: newUsername
      })
      .expect(400)

    // just email
    await request(app)
      .post('/authentication')
      .send({
        email: newUsername
      })
      .expect(400)

    // expect otp not populated
    let otp = await redis.get(`otp:${newUsername}`)
    assert.strictEqual(otp, null)

    // trigger OTP from first POST
    await request(app)
      .post('/authentication')
      .set(
        'Encoded-Data-Message',
        'Click sign to authenticate with identity service: 1719845800'
      )
      .set(
        'Encoded-Data-Signature',
        '0x60029425041bdabf5f1805a5c41d889df480670a9db1a69f18e74f83650a490b6b36b17cc36cc9c71c915a451e24dde3657e96e198b29991361fdb8d2d46a4c11c'
      )
      .send({
        iv: newIv,
        cipherText: newCipherText,
        lookupKey: newLookupKey,
        oldLookupKey: lookupKey,
        email: newUsername
      })
      .expect(403)

    otp = await redis.get(`otp:${newUsername}`)

    // attempt to change email with OTP and malformed request

    // no signed headers
    await request(app)
      .post('/authentication')
      .send({
        iv: newIv,
        cipherText: newCipherText,
        lookupKey: newLookupKey,
        oldLookupKey: lookupKey,
        email: newUsername,
        otp
      })
      .expect(400)

    // no new auth artifacts with signed headers
    await request(app)
      .post('/authentication')
      .set(
        'Encoded-Data-Message',
        'Click sign to authenticate with identity service: 1719845800'
      )
      .set(
        'Encoded-Data-Signature',
        '0x60029425041bdabf5f1805a5c41d889df480670a9db1a69f18e74f83650a490b6b36b17cc36cc9c71c915a451e24dde3657e96e198b29991361fdb8d2d46a4c11c'
      )
      .send({
        email: newUsername,
        otp
      })
      .expect(400)

    // just email
    await request(app)
      .post('/authentication')
      .send({
        email: newUsername,
        otp
      })
      .expect(400)

    // right otp, correct signature that is derived from wrong wallet
    await request(app)
      .post('/authentication')
      .set(
        'Encoded-Data-Message',
        'Click sign to authenticate with identity service: 1720116743'
      )
      .set(
        'Encoded-Data-Signature',
        '0x4ccd14dce4bdf27c50cb81a29da33f4961c5e2a534275cd1a914304256c9412e481d99d553e457ba72a0bb9e92be8a84c1e6f39dfb70d01efe21e467a741cf4c1c'
      )
      .send({
        iv: newIv,
        cipherText: newCipherText,
        lookupKey: newLookupKey,
        oldLookupKey: lookupKey,
        email: newUsername,
        otp
      })
      .expect(400)

    await request(app)
      .post('/authentication')
      .set(
        'Encoded-Data-Message',
        'Click sign to authenticate with identity service: 1719845800'
      )
      .set(
        'Encoded-Data-Signature',
        '0x60029425041bdabf5f1805a5c41d889df480670a9db1a69f18e74f83650a490b6b36b17cc36cc9c71c915a451e24dde3657e96e198b29991361fdb8d2d46a4c11c'
      )
      .send({
        iv: newIv,
        cipherText: newCipherText,
        lookupKey: newLookupKey,
        oldLookupKey: lookupKey,
        email: newUsername,
        otp
      })
      .expect(200)

    const [newAuthModel, newUserModel] = await getUser({
      walletAddress,
      lookupKey: newLookupKey
    })

    assert.strictEqual(newAuthModel.lookupKey, newLookupKey)
    assert.strictEqual(newUserModel.email, newUsername)
    assert.strictEqual(newUserModel.walletAddress, walletAddress)

    // check old auth model no longer works
    await request(app)
      .get('/authentication')
      .send({
        iv,
        cipherText,
        lookupKey,
        otp
      })
      .expect(400)
  })

  it('skips otp for recognized devices', async function () {
    const redis = app.get('redis')
    const visitorId = 'abc123'
    await signUpUser()
    const userRecord = await models.User.findOne({
      where: { email: 'dheeraj@audius.co' }
    })
    await userRecord.update({ blockchainUserId: 1 })

    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        visitorId
      })
      .expect(403)

    let fpRecord = await models.Fingerprints.findOne({ where: { visitorId } })
    assert.strictEqual(fpRecord, null)

    const otp = await redis.get('otp:dheeraj@audius.co')

    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        visitorId,
        otp
      })
      .expect(200)

    // validateFingerprint is called asynchronously and not awaited.
    // This should be plenty of time since the dependency is mocked in test/lib/app.js
    await new Promise((resolve) => setTimeout(resolve, 100))

    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'dheeraj@audius.co',
        visitorId
      })
      .expect(200)

    // a valid visitorId should not allow login with an invalid email
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'wrongemail@audius.co',
        visitorId
      })
      .expect(400)

    // a valid visitorId should not allow login with an invalid email, even with otp present
    await request(app)
      .get('/authentication')
      .query({
        lookupKey:
          '9bdc91e1bb7ef60177131690b18349625778c14656dc17814945b52a3f07ac77',
        username: 'wrongemail@audius.co',
        visitorId,
        otp
      })
      .expect(400)

    fpRecord = await models.Fingerprints.findOne({ where: { visitorId } })
    assert.ok(fpRecord)
    assert.strictEqual(fpRecord.visitorId, visitorId)

    await fpRecord.destroy()
  })
})
