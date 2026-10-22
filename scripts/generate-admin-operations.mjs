import { readFile, writeFile } from 'node:fs/promises';

const document = JSON.parse(await readFile('docs/openapi/admin.json', 'utf8'));
const generated = await readFile('src/api/generated/zod/admin.ts', 'utf8');
const operations = [];

function resolve(value) {
  if (value?.$ref)
    return resolve(document.components.schemas[value.$ref.split('/').at(-1)]);

  if (Array.isArray(value)) return value.map(resolve);

  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolve(child)]),
    );

  return value;
}

for (const [path, methods] of Object.entries(document.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

    const name = operation.operationId
      .split(/[^a-zA-Z0-9]+/)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('');
    const schema = (suffix) =>
      generated.includes(`export const ${name}${suffix} =`)
        ? `schemas.${name}${suffix}`
        : 'undefined';
    const parameters = operation.parameters ?? [];

    for (const [location, suffix] of [
      ['path', 'Params'],
      ['query', 'QueryParams'],
    ]) {
      if (
        parameters.some((parameter) => parameter.in === location) &&
        schema(suffix) === 'undefined'
      )
        throw new Error(`${method} ${path}: 생성된 ${suffix} 스키마가 없다.`);
    }

    if (
      operation.requestBody?.required &&
      schema('Body') === 'undefined' &&
      !(
        (path === '/api/v1/admin/originals' && method === 'post') ||
        (path === '/api/v1/admin/originals/{storyId}' && method === 'patch')
      )
    )
      throw new Error(`${method} ${path}: 생성된 본문 스키마가 없다.`);

    operations.push(
      `  { path: ${JSON.stringify(path)}, method: ${JSON.stringify(method.toUpperCase())}, parameters: ${JSON.stringify(parameters.map(resolve))}, params: ${schema('Params')}, query: ${schema('QueryParams')}, body: ${schema('Body')}, bodyRequired: ${!!operation.requestBody?.required} }`,
    );
  }
}

await writeFile(
  'src/api/generated/admin-operations.ts',
  `/** 관리자 OpenAPI와 Orval 출력에서 생성한다. 직접 수정하지 않는다. */\nimport * as schemas from './zod/admin';\n\nexport const adminOperations = [\n${operations.join(',\n')}\n];\n`,
);
