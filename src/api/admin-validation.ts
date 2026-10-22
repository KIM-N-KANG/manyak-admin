import { type NextRequest } from 'next/server';
import type { ZodType } from 'zod';

import { ReleaseBody } from '@/api/generated/zod/admin';

interface ParameterSchema {
  type?: string | string[];
  properties?: Record<string, ParameterSchema>;
  additionalProperties?: unknown;
}

interface Operation {
  parameters: { name: string; in: string; schema: ParameterSchema }[];
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
  bodyRequired: boolean;
}

function queryValue(value: string, schema: ParameterSchema): unknown {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];

  if (types.includes('integer') || types.includes('number')) {
    const number = value.trim() ? Number(value) : NaN;

    if (
      types.includes('integer') &&
      (!/^[+-]?\d+$/.test(value) || !Number.isSafeInteger(number))
    )
      throw new Error('정수가 필요하다.');

    return number;
  }

  if (types.includes('boolean')) {
    if (value !== 'true' && value !== 'false')
      throw new Error('불리언이 필요하다.');

    return value === 'true';
  }

  return value;
}

/** Spring의 평탄한 쿼리를 OpenAPI의 request/query 객체로 묶어 생성 Zod에 전달한다. */
export async function validateAdminRequest(
  request: NextRequest,
  operation: Operation,
  serverPath: string,
  templatePath: string,
) {
  const query = request.nextUrl.searchParams;
  const queryInput: Record<string, unknown> = {};
  const known = new Set<string>();
  const pathInput: Record<string, string> = {};

  for (const parameter of operation.parameters) {
    if (parameter.in === 'path') {
      const index = templatePath.split('/').indexOf(`{${parameter.name}}`);

      pathInput[parameter.name] = decodeURIComponent(
        serverPath.split('/')[index],
      );
    }

    if (parameter.in !== 'query') continue;

    if (parameter.schema.type === 'object') {
      const fields = parameter.schema.properties;
      const values: Record<string, unknown> = {};

      for (const [key, value] of query) {
        if (fields && !(key in fields)) continue;

        known.add(key);
        values[key] = queryValue(value, fields?.[key] ?? {});
      }

      queryInput[parameter.name] = values;
    } else {
      known.add(parameter.name);

      if (query.has(parameter.name))
        queryInput[parameter.name] = queryValue(
          query.get(parameter.name)!,
          parameter.schema,
        );
    }
  }

  for (const key of query.keys())
    if (!known.has(key) || query.getAll(key).length !== 1)
      throw new Error('지원하지 않거나 중복된 쿼리이다.');

  if (operation.params && !operation.params.safeParse(pathInput).success)
    throw new Error('경로가 올바르지 않다.');

  if (operation.query && !operation.query.safeParse(queryInput).success)
    throw new Error('쿼리가 올바르지 않다.');

  if (!operation.bodyRequired && !operation.body) return undefined;

  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw new Error('JSON 본문이 필요하다.');

  const body: unknown = await request.json();
  // ObjectNode 본문은 OpenAPI에 필드가 없다. 생성된 공통 사유를 검증하고 나머지 필드는 서버가 검증한다.
  const schema = operation.body ?? ReleaseBody.passthrough();

  if (!schema.safeParse(body).success) throw new Error('본문이 올바르지 않다.');

  return JSON.stringify(body);
}
