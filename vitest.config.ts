import { ViteUserConfig, defineConfig } from 'vitest/config'

import { fileURLToPath } from 'node:url'

const sharedExclude = ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*']

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
        alias: {
            'src': resolvePath('./src'),
            'kanun': resolvePath('./src/index.ts'),
        },
    } as ViteUserConfig['resolve'],
    test: {
        root: './',
        passWithNoTests: true,
        projects: [
            {
                extends: true,
                test: {
                    name: 'node',
                    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
                    exclude: [...sharedExclude, '**/*.browser.test.ts'],
                    environment: 'node',
                },
            },
            {
                extends: true,
                test: {
                    name: 'browser',
                    include: ['**/*.browser.test.ts'],
                    exclude: sharedExclude,
                    environment: 'happy-dom',
                },
            },
        ],
        coverage: {
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: sharedExclude,
        },
    },
})
