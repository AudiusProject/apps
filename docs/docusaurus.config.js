// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from 'prism-react-renderer'

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Audius Dev Docs',
  tagline:
    'Audius is a fully decentralized music platform. ARTISTS (AND DEVELOPERS) DESERVE MORE 💜',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://docs.audius.org',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'AudiusProject', // Usually your GitHub org/user name.
  projectName: 'docs.audius.org', // Usually your repo name.

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/AudiusProject/apps/tree/main/docs',
          docItemComponent: '@theme/ApiItem', // add @theme/ApiItem here
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-XSRDQBKXVX',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/dev.jpg',
      docs: {
        sidebar: {
          hideable: true,
        },
      },
      // announcementBar: {
      //   id: 'amplify_hackathon',
      //   content:
      //     '👩‍💻 <a target="_blank" rel="noopener noreferrer" href="https://www.audius.events/e/hackathon">Join the Amplify Hackathon!</a> 🚀  Submissions due September 30, 2024 at 11:55pm PST',
      //   backgroundColor: '#7e1bcc',
      //   textColor: '#fff',
      //   isCloseable: false,
      // },
      navbar: {
        title: '| Dev Docs',
        hideOnScroll: false,
        logo: {
          alt: 'Audius Logo',
          src: 'img/logo.png',
          srcDark: 'img/logo-white.png',
        },
        items: [
          {
            label: 'Welcome',
            to: '/',
            position: 'right',
            activeBaseRegex: '^/$|^$',
          },
          {
            label: 'API',
            to: '/api',
            position: 'right',
            activeBasePath: 'api',
          },
          {
            label: 'SDK',
            to: '/sdk',
            position: 'right',
            activeBasePath: 'sdk',
          },
          {
            label: 'Guides',
            to: '/developers/introduction/overview',
            position: 'right',
            activeBasePath: 'developers',
          },
          {
            label: 'Distributors',
            to: '/distributors/introduction/overview',
            position: 'right',
            activeBasePath: 'distributors',
          },
          {
            'aria-label': 'Discord',
            className: 'navbar--discord-link',
            href: 'https://discord.com/invite/audius',
            position: 'right',
          },
          {
            'aria-label': 'GitHub',
            className: 'navbar--github-link',
            href: 'https://github.com/AudiusProject',
            position: 'right',
          },
        ],
      },
      algolia: {
        appId: '5HE2PIGNOV',
        // This API key is "search-only" and safe to be published
        apiKey: '347af1fe50a2533f274a4a64a695c64c',
        indexName: 'audius',
        contextualSearch: true,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        // additionalLanguages: ['ruby', 'csharp', 'php', 'java', 'powershell'],
      },
      languageTabs: [
        {
          highlight: 'bash',
          language: 'curl',
          logoClass: 'bash',
          variant: 'cURL',
        },
        {
          highlight: 'python',
          language: 'python',
          logoClass: 'python',
          variant: 'requests',
          variants: ['requests', 'http.client'],
        },
        {
          highlight: 'go',
          language: 'go',
          logoClass: 'go',
          variant: 'native',
          variants: ['native'],
        },
        {
          highlight: 'javascript',
          language: 'nodejs',
          logoClass: 'nodejs',
          variant: 'axios',
          variants: ['native', 'axios', 'request'],
        },
      ],
    }),
  markdown: {
    mermaid: true,
  },
  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic', // e.g. "classic" or the plugin-content-docs id
        config: {
          api: {
            specPath: 'docs/developers/openapi.yaml', // synced from https://api.audius.co/v1/swagger.yaml
            outputDir: 'docs/developers/api', // output directory for generated *.mdx and sidebar.js files
            sidebarOptions: {
              groupPathsBy: 'tag', // generate a sidebar.js slice that groups operations by tag
            },
            downloadUrl: 'https://api.audius.co/v1/swagger.yaml',
          },
        },
      },
    ],
  ],
  themes: ['@docusaurus/theme-mermaid', 'docusaurus-theme-openapi-docs'],
}

export default config
