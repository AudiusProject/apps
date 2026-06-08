/**
 * Babel config scoped to this example so the parent app's babel.config.js
 * (packages/mobile) is not used. That parent config has module-resolver
 * aliases for @audius/common that use relative paths and break when
 * the bundler runs from this directory.
 */
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo']
  }
}
