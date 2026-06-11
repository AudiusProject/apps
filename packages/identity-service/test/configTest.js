const assert = require('assert')
const config = require('../src/config')
const {
  generateRandomUUID,
  generateRandomPort,
  generateRandomNaturalNumber,
  generateRandomBoolean,
  generateRandomLogLevel
} = require('./lib/generateRandomValues')
const convict = require('convict')

describe('convict configuration test', function () {
  it('Env key and object key names are equal', function () {
    const schema = config.getSchema().properties

    for (const key in schema) {
      assert(
        key === schema[key].env,
        `The key ${key} and the env key ${schema[key].env} do not match.`
      )
    }
  })

  it('[pass] Adding a number with format as type string will cause config to take its string value', function () {
    const c = convict({
      randomKey: {
        format: String,
        default: null,
        env: 'randomKey'
      }
    })

    process.env.randomKey = 123
    assert(process.env.randomKey === '123')

    c.load({})

    assert(c.get('randomKey') === '123')

    // Calling validate() should not throw an error. If an error is thrown, call assert.fail() to fail test
    try {
      c.validate()
    } catch (e) {
      assert.fail(e)
    }
  })

  it('[pass] Adding a number with format as type nat will cause config to take its numeric value', function () {
    const c = convict({
      randomKey: {
        format: 'nat',
        default: null,
        env: 'randomKey'
      }
    })

    process.env.randomKey = '123'

    c.load({})

    assert(c.get('randomKey') === 123)

    // Calling validate() should not throw an error. If an error is thrown, call assert.fail() to fail test
    try {
      c.validate()
    } catch (e) {
      assert.fail(e)
    }
  })

  it('setting a value through env key, and ensuring the new value is set in config', function () {
    const schema = config.getSchema().properties

    for (const key in schema) {
      // special case this property since config.load will override the test value in the env var because of custom type coercion
      if (key === 'relayerWallets' || key === 'ethRelayerWallets') {
        assert.deepStrictEqual(Array.isArray(config.get(key)), true)
        continue
      }

      const oldValue = config.get(key)

      const format = schema[key].format.toString()

      // setting invalid values
      const invalidValue = getInvalidConfigValue(format)

      if (invalidValue) {
        setAndValidateEnvVar(key, invalidValue)

        // Reload config to grab env vars
        config.load({})

        assert.throws(() => {
          config.validate()
          assert.fail('Did not properly validate config')
        }, Error)
      }

      const validValue = getValidConfigValue(format)

      setAndValidateEnvVar(key, validValue)

      config.load({})

      // convict js converts env vars to its proper type
      assert(
        config.get(key) === validValue,
        `The config key '${key}' with format type '${schema[key].format}' is still retaining its old value of '${oldValue}' instead of '${validValue}'`
      )
    }
  })
})

// Retrieves proper values for validation tests
function getValidConfigValue(format) {
  let validValue

  switch (format) {
    case 'fatal,error,warn,info,debug,trace':
      validValue = generateRandomLogLevel()
      break
    case 'string':
      validValue = generateRandomUUID()
      break
    case 'number':
    case 'nat':
      validValue = generateRandomNaturalNumber()
      break
    case 'port':
      validValue = generateRandomPort()
      break
    case 'boolean':
      validValue = generateRandomBoolean()
  }
  return validValue
}

// Retrieves bad values for validation tests
function getInvalidConfigValue(format) {
  let invalidValue

  switch (format) {
    case 'fatal,error,warn,info,debug,trace':
      invalidValue = generateRandomNaturalNumber()
      break
    case 'nat':
      invalidValue = generateRandomUUID()
      break
    case 'port':
      invalidValue = generateRandomUUID()
      break
    // A format of type string will convert any new value to its string value
    // A format of type boolean will convert any new value to its t/f value
    // A format of type number will convert any new value to NaN, which is a type of number
    case 'string':
    case 'boolean':
    case 'number':
      invalidValue = null
      break
  }
  return invalidValue
}

// Sets and validates env var
function setAndValidateEnvVar(key, newValue) {
  process.env[key] = newValue

  // everything in process.env is typeof string
  assert(
    process.env[key] === newValue.toString(),
    'Env var was not set properly.'
  )
}
