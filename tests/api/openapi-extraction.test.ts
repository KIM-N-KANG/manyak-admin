import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('관리자 경로와 순환 참조 DTO만 추출하고 입력·시각·서버 커밋을 기록한다', () => {
  const directory = mkdtempSync(join(tmpdir(), 'manyak-admin-openapi-'));

  try {
    mkdirSync(join(directory, 'docs/openapi'), { recursive: true });

    const input = join(directory, 'input.json');

    writeFileSync(
      input,
      JSON.stringify({
        openapi: '3.1.0',
        info: { title: 'test', version: '1' },
        paths: {
          '/api/v1/admin/example': {
            get: {
              security: [{ bearerAuth: [] }],
              responses: {
                200: {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Parent' },
                    },
                  },
                },
              },
            },
          },
          '/api/v1/public': { get: {} },
        },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer' },
            unused: { type: 'apiKey', name: 'unused', in: 'header' },
          },
          schemas: {
            Parent: {
              type: 'object',
              properties: { child: { $ref: '#/components/schemas/Child' } },
            },
            Child: {
              type: 'object',
              properties: { parent: { $ref: '#/components/schemas/Parent' } },
            },
            Unrelated: { type: 'string' },
          },
        },
      }),
    );
    execFileSync(
      process.execPath,
      [resolve('scripts/extract-admin-openapi.mjs'), input, 'test-revision'],
      { cwd: directory },
    );

    const result = JSON.parse(
      readFileSync(join(directory, 'docs/openapi/admin.json'), 'utf8'),
    );

    expect(Object.keys(result.paths)).toEqual(['/api/v1/admin/example']);
    expect(Object.keys(result.components.schemas).sort()).toEqual([
      'Child',
      'Parent',
    ]);
    expect(Object.keys(result.components.securitySchemes)).toEqual([
      'bearerAuth',
    ]);
    expect(result['x-source']).toEqual({
      input,
      revision: 'test-revision',
      receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
