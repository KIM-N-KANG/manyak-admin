import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
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

it('지표 응답 매체만 정규화하고 원본과 응답 DTO의 제약은 보존한다', () => {
  const script = `
    import { readFileSync } from 'node:fs';
    import transform from './scripts/transform-admin-openapi.mjs';
    const original = JSON.parse(readFileSync('docs/openapi/admin.json', 'utf8'));
    const before = JSON.stringify(original);
    const generated = transform(original);
    const paths = ['/campaigns/funnels/activation', '/campaigns/reach', '/campaigns/creatives', '/campaigns/app-transfer', '/users/app-activation', '/users/signups', '/users/sessions', '/users/session-lengths', '/quality/client', '/quality/chat-options', '/conversion/funnels/{funnel}'];
    const names = new Set();
    function collect(value) {
      if (!value || typeof value !== 'object') return;
      if (value.$ref?.startsWith('#/components/schemas/')) {
        const name = value.$ref.split('/').at(-1);
        if (!names.has(name)) {
          names.add(name);
          collect(original.components.schemas[name]);
        }
      }
      for (const child of Object.values(value)) collect(child);
    }
    for (const path of paths) collect(original.paths['/api/v1/admin' + path].get.responses['200']);
    console.log(JSON.stringify({
      unchanged: before === JSON.stringify(original),
      responses: paths.map(path => {
        const source = original.paths['/api/v1/admin' + path].get.responses['200'].content;
        const result = generated.paths['/api/v1/admin' + path].get.responses['200'].content;
        return { source, result };
      }),
      schemas: [...names].every(name => JSON.stringify(original.components.schemas[name]) === JSON.stringify(generated.components.schemas[name])),
    }));
  `;
  const result = JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
    }),
  );

  expect(result.unchanged).toBe(true);
  expect(result.schemas).toBe(true);

  for (const { source, result: content } of result.responses) {
    expect(Object.keys(source)).toEqual(['*/*']);
    expect(Object.keys(content)).toEqual(['application/json']);
    expect(content['application/json']).toEqual(source['*/*']);
  }
});

it('채팅 모델 응답의 생성 입력 매체만 정규화하고 원본 계약은 바꾸지 않는다', () => {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import { readFileSync } from 'node:fs';
    import transform from './scripts/transform-admin-openapi.mjs';
    const original = JSON.parse(readFileSync('docs/openapi/admin.json', 'utf8'));
    const before = JSON.stringify(original);
    const generated = transform(original);
    const pairs = [['/chat-models', 'get'], ['/chat-models/{code}/promotion', 'put'], ['/chat-models/{code}/promotion', 'delete']];
    console.log(JSON.stringify({
      unchanged: before === JSON.stringify(original),
      responses: pairs.map(([path, method]) => ({
        source: original.paths['/api/v1/admin' + path][method].responses['200'].content,
        result: generated.paths['/api/v1/admin' + path][method].responses['200'].content,
      })),
      schemasUnchanged: Object.keys(original.components.schemas).filter(name => name.startsWith('AdminChatModel')).every(name => JSON.stringify(original.components.schemas[name]) === JSON.stringify(generated.components.schemas[name])),
    }));
  `,
      ],
      { encoding: 'utf8' },
    ),
  );

  expect(result.unchanged).toBe(true);
  expect(result.schemasUnchanged).toBe(true);

  for (const { source, result: content } of result.responses) {
    expect(Object.keys(source)).toEqual(['*/*']);
    expect(Object.keys(content)).toEqual(['application/json']);
    expect(content['application/json']).toEqual(source['*/*']);
  }
});

it('메타데이터 없는 실제 OpenAPI를 임시 폴더에서 추출하고 생성해도 홈 섹션 보완을 유지한다', () => {
  const directory = mkdtempSync(join(tmpdir(), 'manyak-home-extraction-'));

  try {
    mkdirSync(join(directory, 'docs/openapi'), { recursive: true });
    mkdirSync(join(directory, 'src/api/generated/zod'), { recursive: true });
    mkdirSync(join(directory, 'scripts'), { recursive: true });
    symlinkSync(
      resolve('node_modules'),
      join(directory, 'node_modules'),
      'dir',
    );
    writeFileSync(
      join(directory, 'package.json'),
      JSON.stringify({ type: 'module', dependencies: { zod: '^4.4.3' } }),
    );
    copyFileSync(
      'orval.admin.config.ts',
      join(directory, 'orval.admin.config.ts'),
    );

    for (const name of [
      'extract-admin-openapi.mjs',
      'transform-admin-openapi.mjs',
      'overlay-home-sections-openapi.mjs',
      'refine-home-section-zod.mjs',
    ])
      copyFileSync(resolve('scripts', name), join(directory, 'scripts', name));

    const original = JSON.parse(
      readFileSync('docs/openapi/admin.json', 'utf8'),
    );

    delete original['x-contract-overlay'];
    delete original['x-source'];

    const input = join(directory, 'input.json');

    writeFileSync(input, JSON.stringify(original));
    execFileSync(
      process.execPath,
      [
        join(directory, 'scripts/extract-admin-openapi.mjs'),
        input,
        'test-revision',
      ],
      { cwd: directory },
    );

    const snapshot = JSON.parse(
      readFileSync(join(directory, 'docs/openapi/admin.json'), 'utf8'),
    );

    expect(snapshot['x-contract-overlay']).toBeUndefined();
    expect(snapshot.components.schemas.HomeSectionCreateRequest).toEqual(
      original.components.schemas.HomeSectionCreateRequest,
    );
    execFileSync(
      process.execPath,
      [
        resolve('node_modules/orval/dist/bin/orval.mjs'),
        '--config',
        join(directory, 'orval.admin.config.ts'),
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          PATH: resolve('node_modules/.bin') + ':' + process.env.PATH,
        },
        stdio: 'pipe',
      },
    );

    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
      import ts from 'typescript';
      import { readFileSync, writeFileSync } from 'node:fs';
      const source = readFileSync('src/api/generated/zod/admin.ts','utf8');
      const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
      writeFileSync('src/api/generated/zod/admin.mjs', code);
      const { Create5Body, Update3Body, List4Response } = await import('./src/api/generated/zod/admin.mjs');
      const valid = {name:' '.repeat(30)+'가',source:'FILTER',sort:'popular',reason:'변경'};
      console.log(JSON.stringify({ name: Create5Body.parse(valid).name, decimalCreate: Create5Body.safeParse({...valid,itemLimit:1.5}).success, decimalUpdate: Update3Body.safeParse({reason:'변경',sortOrder:1.5}).success, blankReason: Create5Body.safeParse({...valid,reason:' '}).success, missingItems: List4Response.safeParse({}).success, invalidStory: Create5Body.safeParse({...valid,storyIds:['invalid']}).success, tooManyGenres: Create5Body.safeParse({...valid,genres:Array(11).fill('로맨스')}).success, nullFlag: Update3Body.safeParse({reason:'변경',originalOnly:null}).success }));
    `,
        ],
        { cwd: directory, encoding: 'utf8' },
      ),
    );

    expect(result).toEqual({
      name: '가',
      decimalCreate: false,
      decimalUpdate: false,
      blankReason: false,
      missingItems: false,
      invalidStory: false,
      tooManyGenres: false,
      nullFlag: false,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
