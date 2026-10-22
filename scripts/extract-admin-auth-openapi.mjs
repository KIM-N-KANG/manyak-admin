import { readFileSync, writeFileSync } from 'node:fs';

const input = process.argv[2];
const revision = process.argv[3];

if (!input || !revision)
  throw new Error(
    '서버 /v3/api-docs JSON 파일 경로와 서버 커밋 SHA가 필요하다.',
  );

const document = JSON.parse(readFileSync(input, 'utf8'));
const path = '/api/v1/admin/auth/login/google';

if (!document.paths[path]) throw new Error('관리자 로그인 경로가 없다.');

const schemas = {};

function collect(value) {
  if (!value || typeof value !== 'object') return;

  if (value.$ref?.startsWith('#/components/schemas/')) {
    const name = value.$ref.split('/').at(-1);

    if (!(name in schemas)) {
      schemas[name] = document.components.schemas[name];
      collect(schemas[name]);
    }
  }

  for (const child of Object.values(value)) collect(child);
}

collect(document.paths[path]);
writeFileSync(
  'docs/openapi/admin-auth.json',
  JSON.stringify(
    {
      openapi: document.openapi,
      info: {
        title: 'Manyak admin auth',
        version: 'KNK-1738',
        description: `manyak-server ${revision} /v3/api-docs의 로그인 경로와 참조 스키마를 추출했다.`,
      },
      paths: { [path]: document.paths[path] },
      components: { schemas },
    },
    null,
    2,
  ) + '\n',
);
