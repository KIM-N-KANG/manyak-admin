import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

import transform from './transform-admin-openapi.mjs';

// Orval 8.17이 누락하는 trim과 정수 검사를 변환된 OpenAPI에 따라 생성한다.
const document = transform(
  JSON.parse(await readFile('docs/openapi/admin.json', 'utf8')),
);
const target = 'src/api/generated/zod/admin.ts';
const source = ts.createSourceFile(
  target,
  await readFile(target, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const bodies = new Map();

for (const path of [
  '/api/v1/admin/home-sections',
  '/api/v1/admin/home-sections/{sectionId}',
]) {
  for (const method of ['post', 'patch']) {
    const operation = document.paths[path]?.[method];

    if (!operation) continue;

    const reference =
      operation.requestBody.content['application/json'].schema.$ref;
    const schema = document.components.schemas[reference.split('/').at(-1)];
    const name =
      operation.operationId
        .split(/[^a-zA-Z0-9]+/)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join('') + 'Body';

    bodies.set(name, schema.properties);
  }
}

const edits = [];
const seen = new Set();

function inspect(node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    bodies.has(node.name.text)
  ) {
    const fields = bodies.get(node.name.text);
    const checks = new Set();

    function inspectProperty(child) {
      if (ts.isPropertyAssignment(child)) {
        const name = child.name.getText(source).replace(/^['"]|['"]$/g, '');
        const field = fields[name];
        const check = field?.['x-trim']
          ? ['string', 'trim']
          : field?.type === 'integer'
            ? ['number', 'int']
            : null;

        if (check) {
          function inspectCall(call) {
            if (
              ts.isCallExpression(call) &&
              ts.isPropertyAccessExpression(call.expression) &&
              call.expression.name.text === check[0]
            ) {
              checks.add(name);

              if (
                !(
                  ts.isPropertyAccessExpression(call.parent) &&
                  call.parent.name.text === check[1]
                )
              )
                edits.push({ offset: call.end, text: `.${check[1]}()` });
            }

            ts.forEachChild(call, inspectCall);
          }

          inspectCall(child.initializer);
        }
      }

      ts.forEachChild(child, inspectProperty);
    }

    inspectProperty(node);

    for (const [name, field] of Object.entries(fields)) {
      if ((field['x-trim'] || field.type === 'integer') && !checks.has(name))
        throw new Error(`생성 필드가 없다: ${node.name.text}.${name}`);
    }

    seen.add(node.name.text);
  }

  ts.forEachChild(node, inspect);
}

inspect(source);

for (const name of bodies.keys()) {
  if (!seen.has(name)) throw new Error(`생성 본문 스키마가 없다: ${name}`);
}

let output = source.text;

for (const { offset, text } of edits.sort((a, b) => b.offset - a.offset))
  output = output.slice(0, offset) + text + output.slice(offset);

await writeFile(target, output);
