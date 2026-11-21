module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeViewBox: false,
          cleanupIds: {
            minify: false,
            remove: false
          },
          removeUselessDefs: false,
          removeTitle: false
        }
      }
    }
  ]
}
