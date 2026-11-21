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

    try {
      c.validate()
    } catch (e) {
      assert.fail(e)
    }
  })

  it('setting a value through env key, and ensuring the new value is set in config', function () {
    const schema = config.getSchema().properties

    for (const key in schema) {
      if (key === 'relayerWallets' || key === 'ethRelayerWallets') {
        assert.deepStrictEqual(Array.isArray(config.get(key)), true)
        continue
      }

      const oldValue = config.get(key)

      const format = schema[key].format.toString()

      const invalidValue = getInvalidConfigValue(format)

      if (invalidValue) {
        setAndValidateEnvVar(key, invalidValue)

        config.load({})

        assert.throws(() => {
          config.validate()
          assert.fail('Did not properly validate config')
        }, Error)
      }

      const validValue = getValidConfigValue(format)

      setAndValidateEnvVar(key, validValue)

      config.load({})

      assert(
        config.get(key) === validValue,
        `The config key '${key}' with format type '${schema[key].format}' is still retaining its old value of '${oldValue}' instead of '${validValue}'`
      )
    }
  })
})

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
    case 'string':
    case 'boolean':
    case 'number':
      invalidValue = null
      break
  }
  return invalidValue
}

function setAndValidateEnvVar(key, newValue) {
  process.env[key] = newValue

  assert(
    process.env[key] === newValue.toString(),
    'Env var was not set properly.'
  )
}
