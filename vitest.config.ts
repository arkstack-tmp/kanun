import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

const sharedExclude = ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*']

export default defineConfig({
    plugins: [tsconfigPaths()],
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
