import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/utils/api.ts',
        'src/features/resume/model/*.ts',
      ],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
      thresholds: {
        statements: 50,
        branches: 20,
        functions: 50,
        lines: 50,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large vendor dependencies into dedicated chunks so the
        // initial entry stays lean. Feature-specific libs (pdf, dnd, charts,
        // mammoth ...) are only pulled in by lazy-loaded routes.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'pdf': ['pdfjs-dist'],
          'dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'charts': ['recharts'],
          'editor-deps': ['date-fns', 'uuid', 'qrcode.react'],
          'mammoth': ['mammoth'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 5173,
    // Proxy API requests to Go backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5180,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
