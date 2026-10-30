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

it.each([undefined, '로컬 병합 #435 6811081 + #434 aeea52c'])(
  '관리자 경로와 순환 참조 DTO를 추출하고 입력·시각·커밋·출처 %s를 기록한다',
  (description) => {
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
        [
          resolve('scripts/extract-admin-openapi.mjs'),
          input,
          'test-revision',
          ...(description ? [description] : []),
        ],
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
        ...(description ? { description } : {}),
        receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

it('실제 인프라 와일드카드 응답의 생성 입력만 JSON으로 정규화하고 원본과 null 묶음을 보존한다', () => {
  const script = `
    import { readFileSync } from 'node:fs';
    import transform from './scripts/transform-admin-openapi.mjs';
    const original = JSON.parse(readFileSync('docs/openapi/admin.json', 'utf8'));
    const input = JSON.stringify(original);
    const generated = transform(original);
    console.log(JSON.stringify({
      unchanged: input === JSON.stringify(original),
      original: original.paths['/api/v1/admin/infra/metrics'].get.responses['200'].content,
      normalized: generated.paths['/api/v1/admin/infra/metrics'].get.responses['200'].content,
      table: generated.paths['/api/v1/admin/infra/db-tables'].get.responses['200'].content,
      schemasUnchanged: Object.keys(original.components.schemas).filter(name => name.startsWith('Infra')).every(name => JSON.stringify(original.components.schemas[name]) === JSON.stringify(generated.components.schemas[name])),
    }));
  `;
  const result = JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
    }),
  );

  expect(result.unchanged).toBe(true);
  expect(Object.keys(result.original)).toEqual(['*/*']);
  expect(Object.keys(result.normalized)).toEqual(['application/json']);
  expect(result.normalized['application/json']).toEqual(result.original['*/*']);
  expect(result.table['application/json'].schema.$ref).toBe(
    '#/components/schemas/InfraDatabaseResponse',
  );
  expect(result.schemasUnchanged).toBe(true);
});
