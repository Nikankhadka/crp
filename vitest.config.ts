import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // NodeNext source imports use .js specifiers that map to .ts files.
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    environment: 'node',
  },
});
