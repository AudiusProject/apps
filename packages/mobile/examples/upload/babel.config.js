/**
 * Babel config scoped to this example.
 */
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo']
  }
}
