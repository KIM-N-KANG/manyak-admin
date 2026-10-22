import { defineConfig } from 'orval';

export default defineConfig({
  auth: {
    input: { target: './docs/openapi/admin-auth.json' },
    output: {
      mode: 'single',
      target: './src/api/generated/zod/admin-auth.ts',
      client: 'zod',
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
