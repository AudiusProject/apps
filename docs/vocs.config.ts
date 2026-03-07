import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'Audius Developer Docs',
  description:
    'Audius is a fully decentralized music platform. Build on the largest open music catalog on the internet.',
  logoUrl: {
    light: '/img/logo-mono.svg',
    dark: '/img/logo-mono.svg',
  },
  iconUrl: '/img/favicon.ico',
  rootDir: 'docs',
  ogImageUrl: '/img/dev.jpg',
  theme: {
    accentColor: { light: '#7F6AD6', dark: '#9E8EE8' },
    variables: {
      color: {
        textAccent: { light: '#7F6AD6', dark: '#9E8EE8' },
        background: { light: '#ffffff', dark: '#141414' },
        backgroundDark: { light: '#F7F7F8', dark: '#1F1F1F' },
      },
      fontFamily: {
        default:
          "'Avenir Next LT Pro', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      },
    },
  },
  topNav: [
    { text: 'Welcome', link: '/' },
    { text: 'API', link: '/api' },
    { text: 'SDK', link: '/sdk' },
    { text: 'Guides', link: '/developers/introduction/overview' },
    { text: 'Distributors', link: '/distributors/introduction/overview' },
  ],
  socials: [
    { icon: 'discord', link: 'https://discord.com/invite/audius' },
    { icon: 'github', link: 'https://github.com/AudiusProject' },
  ],
  sidebar: [
    {
      text: 'Getting Started',
      items: [{ text: 'Welcome', link: '/' }],
    },
    { text: 'REST API', link: '/api' },
    {
      text: 'Javascript SDK',
      collapsed: true,
      items: [
        { text: 'Getting Started', link: '/sdk' },
        { text: 'Tracks', link: '/sdk/tracks' },
        { text: 'Uploads', link: '/sdk/uploads' },
        { text: 'Users', link: '/sdk/users' },
        { text: 'Playlists', link: '/sdk/playlists' },
        { text: 'Albums', link: '/sdk/albums' },
        { text: 'Resolve', link: '/sdk/resolve' },
        { text: 'OAuth', link: '/sdk/oauth' },
        { text: 'Progress Events', link: '/sdk/progress-events' },
        {
          text: 'Unreal Engine Plugin',
          link: '/sdk/community-projects/unreal-engine-plugin',
        },
        { text: 'Go SDK', link: '/sdk/community-projects/go-sdk' },
      ],
    },
    {
      text: 'Guides',
      collapsed: true,
      items: [
        { text: 'Overview', link: '/developers/introduction/overview' },
        {
          text: 'Create Audius App',
          link: '/developers/guides/create-audius-app',
        },
        {
          text: 'Log in with Audius',
          link: '/developers/guides/log-in-with-audius',
        },
        {
          text: 'Image Mirrors',
          link: '/developers/guides/image-mirrors',
        },
        {
          text: 'Gate Release Access',
          link: '/developers/guides/gate-release-access',
        },
        { text: 'Hedgehog', link: '/developers/guides/hedgehog' },
        {
          text: 'Link Audius Account',
          link: '/developers/guides/link-audius-account-to-protocol-dashboard',
        },
        { text: 'The Graph', link: '/developers/guides/subgraph' },
      ],
    },
    {
      text: 'Distributors',
      collapsed: true,
      items: [
        {
          text: 'Overview',
          link: '/distributors/introduction/overview',
        },
        {
          text: 'Specification',
          items: [
            {
              text: 'Overview',
              link: '/distributors/specification/overview',
            },
            {
              text: 'Metadata',
              link: '/distributors/specification/metadata',
            },
            {
              text: 'Deal Types',
              items: [
                {
                  text: 'Recommended',
                  link: '/distributors/specification/deal-types/recommended',
                },
                {
                  text: 'Supported Deal Types',
                  link: '/distributors/specification/deal-types/supported-deal-types',
                },
              ],
            },
          ],
        },
        {
          text: 'Self Serve',
          items: [
            {
              text: 'Overview',
              link: '/distributors/self-serve/overview',
            },
            {
              text: 'Run a DDEX Server',
              link: '/distributors/self-serve/run-a-ddex-server',
            },
          ],
        },
      ],
    },
    {
      text: 'Learn',
      collapsed: true,
      items: [
        {
          text: 'Architecture',
          items: [
            {
              text: 'Content Node',
              link: '/learn/architecture/content-node',
            },
            {
              text: 'Discovery Node',
              link: '/learn/architecture/discovery-node',
            },
          ],
        },
        {
          text: 'Concepts',
          items: [
            { text: 'Protocol', link: '/learn/concepts/protocol' },
            { text: 'Token ($AUDIO)', link: '/learn/concepts/token' },
            {
              text: 'Staking & Delegating',
              link: '/learn/concepts/staking-and-delegating',
            },
          ],
        },
        {
          text: 'Contributing',
          items: [
            {
              text: 'Overview',
              link: '/learn/contributing/overview',
            },
            {
              text: 'Governance',
              link: '/learn/contributing/governance',
            },
          ],
        },
      ],
    },
    {
      text: 'Reference',
      collapsed: true,
      items: [
        { text: 'Overview', link: '/reference/overview' },
        { text: 'Link Protocol Profile', link: '/reference/protocol-dashboard/link-profile' },
      ],
    },
  ],
})
