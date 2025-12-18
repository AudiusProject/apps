module.exports = (api) => {
  const babelEnv = api.env()
  const plugins = [
    'babel-plugin-react-compiler',
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        root: ['.'],
        alias: {
          '@audius/common/adapters': '../common/src/adapters',
          '@audius/common/messages': '../common/src/messages',
          '@audius/common/hooks': '../common/src/hooks',
          '@audius/common/context': '../common/src/context',
          '@audius/common/api': '../common/src/api',
          '@audius/common/models': '../common/src/models',
          '@audius/common/utils': '../common/src/utils',
          '@audius/common/schemas': '../common/src/schemas',
          '@audius/common/services': '../common/src/services',
          '@audius/common/api': '../common/src/api',
          '@audius/common/store': '../common/src/store'
        }
      }
    ]
  ]

  if (babelEnv !== 'development') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }])
  }

  plugins.push('react-native-reanimated/plugin')

  return {
    presets: [
      [
        'module:@react-native/babel-preset',
        { useTransformReactJSXExperimental: true }
      ]
    ],
    plugins
  }
}
