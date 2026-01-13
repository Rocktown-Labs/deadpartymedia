import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    // Plugin to intercept CSS imports and PostCSS config before Vite processes them
    {
      name: 'css-mock',
      enforce: 'pre',
      load(id) {
        // Handle CSS files as empty modules
        if (id.endsWith('.css') || id.endsWith('.module.css') || id.includes('globals.css')) {
          return 'export default {}'
        }
        // Return empty PostCSS config if the file is requested
        if (
          id.includes('postcss.config.mjs') ||
          id.includes('postcss.config.js') ||
          id.includes('postcss.config.ts') ||
          id === '\0virtual:postcss-config'
        ) {
          return 'export default { plugins: [] }'
        }
      },
      resolveId(id) {
        // Intercept PostCSS config file resolution - redirect to virtual module
        const postcssConfigPattern = /postcss\.config\.(mjs|js|ts|cjs)$/
        if (postcssConfigPattern.test(id)) {
          return '\0virtual:postcss-config'
        }
      },
    },
  ],
  // Prevent Vite from loading .env files in tests
  // Set envDir to a non-existent directory to prevent .env file reads
  envDir: path.resolve(__dirname, './tests'),
  envPrefix: [],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    // Use threads pool with isolation to prevent stack overflow
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/__mocks__',
        '**/types',
        '.next/',
        'e2e/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure .d.ts files are resolved
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
  },
  // Disable CSS processing entirely in tests
  // Explicitly provide empty PostCSS config to prevent auto-discovery
  css: {
    postcss: {
      plugins: [],
    },
    // Disable CSS modules processing
    modules: {
      generateScopedName: '[local]',
    },
  },
})
