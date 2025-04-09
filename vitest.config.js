import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      exclude: [
        '**/__fixtures__/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.{idea,git,cache,output}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,tsup,build}.config.*',
      ],
      include: [
        'js-instrumentation-profiler/**/*.{js,jsx,ts,tsx}',
      ],
    },
  },
}) 