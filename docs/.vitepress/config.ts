import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  cleanUrls: true,
  base: '/kanun/',
  title: 'Kanun',
  description: 'Framework-agnostic TypeScript-first validation library',
  head: [
    ['link', { rel: 'icon', href: '/banner.jpg' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'description', content: 'Framework-agnostic TypeScript-first validation library' }],
    ['meta', { name: 'keywords', content: 'Validation, TypeScript, Framework-agnostic' }],
    ['meta', { name: 'author', content: 'Toneflix' }],
    ['meta', { property: 'og:title', content: 'Kanun' }],
    ['meta', { property: 'og:description', content: 'Framework-agnostic TypeScript-first validation library' }],
    ['meta', { property: 'og:image', content: '/banner.jpg' }],
    ['meta', { property: 'og:url', content: 'https://arkstack-hq.github.io/kanun/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Kanun' }],
    ['meta', { name: 'twitter:description', content: 'Framework-agnostic TypeScript-first validation library' }],
    ['meta', { name: 'twitter:image', content: '/banner.jpg' }]
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/validator' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Validation Rules', link: '/guide/validation-rules' },
          { text: 'Database Driver', link: '/guide/database-driver' },
          { text: 'Custom Rules', link: '/guide/custom-rules' },
          { text: 'Plugins', link: '/guide/plugins' },
          { text: 'Error Handling', link: '/guide/error-handling' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Validator', link: '/api/validator' },
          { text: 'ValidationRule', link: '/api/validation-rule' },
          { text: 'ValidationException', link: '/api/validation-exception' },
          { text: 'Database Driver Contract', link: '/api/database-driver' },
        ]
      },
      {
        text: 'More',
        items: [
          { text: 'Roadmap', link: '/more/roadmap' },
          { text: 'Contributing', link: '/more/contributing' },
          { text: 'Changelog', link: '/more/changelog' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/arkstack-hq/kanun' }
    ]
  }
})
