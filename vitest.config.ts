import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts', 'tests/unit/**/*.{test,spec}.tsx'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@schemas': path.resolve(__dirname, 'src/schemas'),
    },
  },
})


