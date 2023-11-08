module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: ['audius'],
  settings: {
    'import/resolver': {
      // NOTE: sk - These aliases are required for the import/order rule.
      // We are using the typescript baseUrl to do absolute import paths
      // relative to /src, which eslint can't tell apart from 3rd party deps
      alias: {
        map: [
          ['@audius/common', '../common/src'],
          ['__mocks__', './src/__mocks__'],
          ['audio', './src/audio'],
          ['assets', './src/assets'],
          ['common', './src/common'],
          ['components', './src/components'],
          ['hooks', './src/hooks'],
          ['models', './src/models'],
          ['schemas', './src/schemas'],
          ['services', './src/services'],
          ['store', './src/store'],
          ['stories', './src/stories'],
          ['types', './src/types'],
          ['utils', './src/utils'],
          ['workers', './src/workers'],
          ['pages', './src/pages']
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }
    }
  },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['react-spring*'],
            message: 'Please use @react-spring/web instead'
          }
        ]
      }
    ]
  }
}
