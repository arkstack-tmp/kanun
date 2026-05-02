import { defineConfig } from 'tsdown'

export default defineConfig({
    exports: true,
    tsconfig: 'tsconfig.json',
    entry: ['src/index.ts'],
    platform: 'node',
    outDir: 'dist',
    format: ['esm'],
    deps: {
        skipNodeModulesBundle: true,
    },
    outExtensions () {
        return {
            dts: '.ts',
            js: '.js'
        }
    }
})
