import { readFile, writeFile } from 'node:fs/promises';

const input = process.argv[2];
const revision = process.argv[3];

if (!input) throw new Error('OpenAPI 입력 URL 또는 파일 경로가 필요하다.');

const receivedAt = new Date().toISOString();
const document = JSON.parse(
  /^https?:\/\//.test(input)
    ? await fetch(input, { signal: AbortSignal.timeout(30000) }).then(
        (response) => {
          if (!response.ok) throw new Error(`OpenAPI HTTP ${response.status}`);

          return response.text();
        },
      )
    : await readFile(input, 'utf8'),
);
const paths = Object.fromEntries(
  Object.entries(document.paths).filter(([path]) =>
    path.startsWith('/api/v1/admin/'),
  ),
);

if (!Object.keys(paths).length) throw new Error('관리자 API 경로가 없다.');

const components = {};

function collect(value) {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value.security)) {
    for (const requirement of value.security) {
      for (const name of Object.keys(requirement)) {
        const scheme = document.components?.securitySchemes?.[name];

        if (!scheme) throw new Error(`인증 정의를 찾을 수 없다: ${name}`);

        components.securitySchemes ??= {};
        components.securitySchemes[name] = scheme;
      }
    }
  }

  if (value.$ref?.startsWith('#/components/')) {
    const [, , category, name] = value.$ref.split('/');

    components[category] ??= {};

    if (!(name in components[category])) {
      const referenced = document.components?.[category]?.[name];

      if (!referenced) throw new Error(`참조를 찾을 수 없다: ${value.$ref}`);

      components[category][name] = referenced;
      collect(referenced);
    }
  }

  for (const child of Object.values(value)) collect(child);
}

collect(paths);
await writeFile(
  'docs/openapi/admin.json',
  JSON.stringify(
    {
      openapi: document.openapi,
      info: {
        ...document.info,
        title: 'Manyak admin API',
        description: '관리자 경로와 해당 경로가 참조하는 구성 요소만 추출했다.',
      },
      'x-source': { input, receivedAt, ...(revision ? { revision } : {}) },
      paths,
      components,
    },
    null,
    2,
  ) + '\n',
);
