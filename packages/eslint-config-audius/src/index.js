module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'plugin:react/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // TODO: enable after react-native migration [C-3548]
    // project: true,
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    '@emotion',
    'jest',
    'import'
  ],
  rules: {
    // TODO: enable after react-native migration [C-3548]
    // '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/member-delimiter-style': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '[iI]gnored',
        args: 'none',
        ignoreRestSiblings: false
      }
    ],
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': ['error'],

    'no-use-before-define': 'off',
    'no-console': ['error', { allow: ['debug', 'info', 'warn', 'error'] }],
    camelcase: 'off',
    'no-unused-vars': 'off',
    'func-call-spacing': 'off',
    semi: ['error', 'never'],
    'no-empty': 'off',
    'arrow-parens': 'off',
    'padded-blocks': 'off',
    indent: 'off',

    'jest/expect-expect': 'off',

    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks:
          '(useThrottledCallback|useDebouncedCallback|useRequiresAccountCallback)'
      }
    ],
    'react/display-name': 'off',
    'react/prop-types': 'off',
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unknown-property': ['error', { ignore: ['css'] }],

    // Let Prettier resolve config natively to match editor behavior
    // This ensures eslint-plugin-prettier uses the same config resolution
    // as Prettier CLI/editor extensions
    'prettier/prettier': [
      'error',
      {},
      {
        usePrettierrc: true
      }
    ],

    'space-before-function-paren': 'off',
    'generator-star-spacing': 'off',

    'import/no-unresolved': 'error',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc'
        },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before'
          }
        ],
        pathGroupsExcludedImportTypes: ['builtin']
      }
    ],
    'no-constant-binary-expression': 'error'
  },
  settings: {
    jest: {
      version: 27
    },
    react: {
      version: '17'
    },
    'import/resolver': {
      typescript: true,
      node: true
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx', '.mdx']
  },
  overrides: [
    {
      files: ['*.mdx'],
      extends: 'plugin:mdx/recommended',
      plugins: ['mdx'],
      parser: 'eslint-mdx'
      // TODO: enable after react-native migration [C-3548]
      // rules: {
      //   '@typescript-eslint/consistent-type-exports': 'off'
      // }
    }
  ]
}
