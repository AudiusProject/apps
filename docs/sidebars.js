module.exports = {
  learn: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['learn/introduction/getting-started'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'learn/concepts/token',
        'learn/concepts/protocol',
        'learn/architecture/content-node',
        'learn/architecture/discovery-node',
        'learn/concepts/staking-and-delegating',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Contributing',
      items: ['learn/contributing/overview', 'learn/contributing/governance'],
      collapsed: false,
    },
  ],

  developers: [
    {
      type: 'category',
      label: 'Introduction',
      items: [
        'developers/introduction/overview',
        'developers/guides/create-audius-app',
        // 'developers/introduction/resources'
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['developers/guides/log-in-with-audius', 'developers/guides/hedgehog'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'The Graph',
      items: [
        'developers/subgraph/overview',
        'developers/subgraph/entities',
        'developers/subgraph/queries',
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
      label: 'Staking',
      items: [
        'node-operator/staking/stake',
        'node-operator/staking/delegate',
        'node-operator/staking/claim',
      ],
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

  reference: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['reference/overview', 'reference/whitepaper'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Protocol Dashboard',
      items: ['reference/protocol-dashboard/link-profile'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Contracts and Programs',
      items: ['reference/eth-contracts', 'reference/solana-programs'],
      collapsed: false,
    },
  ],

  api: [
    ['developers/api/api'],
    // {
    //   type: 'category',
    //   label: 'Overview',
    //   items: ['developers/api/rest-api'],
    //   collapsed: false,
    // },
    {
      type: 'category',
      label: 'Users',
      items: [
        'developers/api/get-user',
        'developers/api/get-user-by-handle',
        'developers/api/get-user-id-from-wallet',
        'developers/api/get-bulk-users',
        'developers/api/search-users',
        'developers/api/get-tracks-by-user',
        'developers/api/get-user-tracks-remixed',
        'developers/api/get-favorites',
        'developers/api/get-reposts',
        'developers/api/get-followers',
        'developers/api/get-following',
        'developers/api/get-subscribers',
        'developers/api/get-supporters',
        'developers/api/get-supported-users',
        'developers/api/get-purchasers',
        'developers/api/get-remixers',
        'developers/api/get-top-track-tags',
        'developers/api/get-related-users',
        'developers/api/verify-id-token',
        'developers/api/get-authorized-apps',
        'developers/api/get-connected-wallets',
        // 'developers/api/download-purchases-as-csv',
        // 'developers/api/download-sales-as-csv',
        // 'developers/api/download-usdc-withdrawals-as-csv',
      ],
      collapsed: true,
    },
    {
      type: 'category',
      label: 'Tracks',
      items: [
        'developers/api/get-track',
        'developers/api/get-track-stems',
        'developers/api/get-bulk-tracks',
        'developers/api/search-tracks',
        'developers/api/get-trending-tracks',
        'developers/api/get-underground-trending-tracks',
        'developers/api/get-track-access-info',
        'developers/api/stream-track',
        'developers/api/download-track',
        'developers/api/inspect-track',
        'developers/api/get-track-top-listeners',
      ],
      collapsed: true,
    },
    {
      type: 'category',
      label: 'Playlists',
      items: [
        'developers/api/get-playlist',
        'developers/api/get-bulk-playlists',
        'developers/api/search-playlists',
        'developers/api/get-playlist-by-handle-and-slug',
        'developers/api/get-trending-playlists',
        'developers/api/get-playlist-access-info',
        'developers/api/get-playlist-tracks',
      ],
      collapsed: true,
    },
    {
      type: 'category',
      label: 'Comments',
      items: [
        'developers/api/track-comments',
        'developers/api/track-comment-count',
        'developers/api/get-comment-replies',
        'developers/api/get-muted-users',
        'developers/api/track-comment-notification-setting',
      ],
      collapsed: true,
    },
    {
      type: 'category',
      label: 'Tips',
      items: ['developers/api/get-tips'],
      collapsed: true,
    },
    {
      type: 'category',
      label: 'Developer Apps',
      items: ['developers/api/get-developer-app', 'developers/api/get-developer-apps'],
      collapsed: true,
    },
    {
      type: 'category',
      label: 'Resolve',
      items: ['developers/api/resolve'],
      collapsed: true,
    },
  ],
}
