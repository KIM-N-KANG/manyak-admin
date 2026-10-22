import { defineConfig } from 'orval';

export default defineConfig({
  admin: {
    input: {
      target: './docs/openapi/admin.json',
      override: { transformer: './scripts/transform-admin-openapi.mjs' },
    },
    output: {
      mode: 'single',
      target: './src/api/generated/zod/admin.ts',
      client: 'zod',
      override: {
        zod: {
          generate: { query: true, param: true, body: true, response: true },
        },
      },
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
