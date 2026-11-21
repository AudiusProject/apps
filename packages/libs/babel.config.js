module.exports = (api) => {
  const isTest = api.env('test')
  if (isTest) {
    return {
      presets: ['@babel/preset-env', '@babel/preset-typescript'],
      plugins: ['dynamic-import-node']
    }
  } else {
    return {
      presets: ['@babel/preset-env']
    }
  }
}
