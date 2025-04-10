import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    forceRerunTriggers: ['**/package.json/**', '**/vitest.config.*/**', '**/vite.config.*/**', '**/__fixtures__/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      exclude: [
        '**/__fixtures__/**',
        'build/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.{idea,git,cache,output}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,tsup,build}.config.*',
      ],
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
      ],
    },
  },
}) 