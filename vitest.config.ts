import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'lib/**/*.test.ts',
      'hooks/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'packages/shared/src/**/*.ts',
        'lib/**/*.ts',
        'hooks/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './'),
      '@bitewalk/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
      'react-native': path.resolve(__dirname, './lib/__mocks__/react-native.ts'),
    },
  },
});
