const { createGroup, assert } = require('painless')
const { cleanEnv, EnvError, str } = require('..')
const { assertPassthrough } = require('./utils')
const test = createGroup()

test('string passthrough', () => {
    assertPassthrough({ FOO: 'bar' }, { FOO: str() })
})

test('strict option: only specified fields are passed through', () => {
    const opts = { strict: true }
    const env = cleanEnv({ FOO: 'bar', BAZ: 'baz' }, {
        FOO: str()
    }, opts)
    assert.deepEqual(env, { FOO: 'bar' })
})

test('missing required string field', () => {
    assert.throws(() => cleanEnv({}, { FOO: str() }), EnvError)
})

test('using provided default value', () => {
    const env = cleanEnv({}, {
        FOO: str({ default: 'asdf' })
    })
    assert.deepEqual(env, { FOO: 'asdf' })
})

test('choices field', () => {
    // Throws when the env var isn't in the given choices:
    const spec = {
        FOO: str({ choices: ['foo', 'bar', 'baz'] })
    }
    assert.throws(() => cleanEnv({}, spec), EnvError, 'not in choices')
    assert.throws(() => cleanEnv({ FOO: 'bad' }, spec), EnvError, 'not in choices')

    // Works fine when a valid choice is given
    assertPassthrough({ FOO: 'bar' }, spec)
    assertPassthrough({ FOO: 'foo' }, spec)
    assertPassthrough({ FOO: 'baz' }, spec)

    // Throws an error when `choices` is not an array
    assert.throws(() => cleanEnv({}, { FOO: str({ choices: 123 }) }), Error, 'must be an array')
})

test('misconfigured spec', () => {
    // Validation throws with different error if spec is invalid
    assert.throws(() => cleanEnv({ FOO: 'asdf' }, { FOO: {} }), EnvError, 'Invalid spec')
})

test('NODE_ENV built-in support', () => {
    // By default, envalid will parse and accept 3 standard NODE_ENV values:
    assertPassthrough({ NODE_ENV: 'production' }, {})
    assertPassthrough({ NODE_ENV: 'development' }, {})
    assertPassthrough({ NODE_ENV: 'test' }, {})

    // Some convenience helpers are available on the cleaned env object:
    assert.strictEqual(cleanEnv({ NODE_ENV: 'production' }, {}).isProduction, true)
    assert.strictEqual(cleanEnv({ NODE_ENV: 'test' }, {}).isTest, true)
    assert.strictEqual(cleanEnv({ NODE_ENV: 'development' }, {}).isDev, true)

    // assume production if NODE_ENV is not specified:
    assert.strictEqual(cleanEnv({}, {}).isProduction, true)
    assert.strictEqual(cleanEnv({}, {}).isDev, false)
    assert.strictEqual(cleanEnv({}, {}).isTest, false)

    // Non-standard values throw an error:
    assert.throws(() => cleanEnv({ NODE_ENV: 'asdf' }, {}), EnvError, 'not in choices')

    // NODE_ENV should always be set. If it is un-set, isProduction & isDev
    // still use the default value:
    const unsetEnv = cleanEnv({ NODE_ENV: '' }, {})
    assert.strictEqual(unsetEnv.isProduction, true)
    assert.strictEqual(unsetEnv.isDev, false)

    // You can override the built-in NODE_ENV validation if you want
    // The built-in convenience helpers can't be overridden though.
    const customSpec = { NODE_ENV: str({ default: 'FOO' }) }
    assert.deepEqual(cleanEnv({}, customSpec), { NODE_ENV: 'FOO' })
    assert.strictEqual(cleanEnv({}, customSpec).isProduction, false)
    assert.strictEqual(cleanEnv({}, customSpec).isDev, false)
})