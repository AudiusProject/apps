module.exports = (api) => {
  const isTest = api.env('test')
  if (isTest) {
    // For jest, convert dynamic imports to requires
    // and transpile typescript
    return {
      presets: ['@babel/preset-env', '@babel/preset-typescript'],
      plugins: ['dynamic-import-node']
    }
  } else {
    // For rollup
    return {
      presets: ['@babel/preset-env']
    }
  }
}
