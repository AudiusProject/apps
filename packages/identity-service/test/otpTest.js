const assert = require('assert')

const { requiresOtp } = require('../src/utils/otp')

describe('reviewer account OTP exceptions', function () {
  it('exempts the exact reviewer email addresses', async function () {
    for (const email of [
      'testflight@audius.co',
      'playstore@audius.co',
      'fb@audius.co',
      'engineering+fb@audius.co'
    ]) {
      assert.strictEqual(await requiresOtp({ email }), false)
    }
  })

  it('requires a code for ordinary accounts and other engineering aliases', async function () {
    for (const email of [
      'listener@example.com',
      'engineering@audius.co',
      'engineering+other@audius.co',
      'engineering+fb@example.com'
    ]) {
      assert.strictEqual(await requiresOtp({ email }), true)
    }
  })
})
