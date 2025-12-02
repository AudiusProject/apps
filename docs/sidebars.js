const apiSidebar = require('./docs/developers/api/sidebar.generated.js');

module.exports = {
  learn: [],

  developers: [
    {
      type: 'category',
      label: 'Guides',
      items: [
        'developers/introduction/overview',
        'developers/guides/create-audius-app',
        'developers/guides/log-in-with-audius',
        'developers/guides/hedgehog',
        'developers/guides/link-audius-account-to-protocol-dashboard',
        'developers/guides/subgraph',
      ],
      collapsed: false,
    },
  ],

  sdk: [
    {
      type: 'category',
      label: 'Javascript SDK',
      items: [
        'developers/sdk/overview',
        'developers/sdk/tracks',
        'developers/upload-track-metadata',
        'developers/sdk/users',
        'developers/sdk/playlists',
        'developers/sdk/albums',
        'developers/sdk/resolve',
        'developers/sdk/oauth',
        'developers/sdk/advanced-options',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Community Projects',
      items: [
        'developers/community-projects/unreal-engine-plugin',
        'developers/community-projects/go-sdk',
      ],
      collapsed: false,
    },
  ],

  distributors: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['distributors/introduction/overview'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Specification',
      items: [
        'distributors/specification/overview',
        'distributors/specification/metadata',
        {
          type: 'category',
          label: 'Deal Types',
          items: [
            'distributors/specification/deal-types/recommended',
            'distributors/specification/deal-types/supported-deal-types',
          ],
          collapsed: false,
        },
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Self Serve',
      items: ['distributors/self-serve/overview', 'distributors/self-serve/run-a-ddex-server'],
      collapsed: false,
    },
  ],

  node_operators: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['node-operator/overview'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Run a Node',
      items: [
        'node-operator/setup/overview',
        'node-operator/setup/wallet-management',
        'node-operator/setup/hardware-requirements',
        'node-operator/setup/installation',
        'node-operator/setup/advanced',
        'node-operator/sla',
        'node-operator/migration-guide',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Register a Node',
      items: [
        'node-operator/setup/registration/registration',
        'node-operator/setup/registration/multi-sig-wallet',
      ],
      collapsed: false,
    },
  ],

  reference: [],

  api: apiSidebar,
}
