import { readFile, writeFile } from 'node:fs/promises';

// ObjectNode로 누락된 홈 섹션 필드만 STORY 4-2-35~38 계약으로 보완한다.
const path = 'docs/openapi/admin.json';
const document = JSON.parse(await readFile(path, 'utf8'));
const string = { type: 'string' };
const uuid = { type: 'string', format: 'uuid' };
const bool = { type: 'boolean' };
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const array = (items) => ({ type: 'array', items });
const reason = {
  ...string,
  minLength: 1,
  maxLength: 500,
  pattern: '[\\s\\S]*\\S[\\s\\S]*',
};
const properties = {
  name: {
    ...string,
    minLength: 1,
    maxLength: 30,
    pattern: '[\\s\\S]*\\S[\\s\\S]*',
  },
  source: { ...string, enum: ['MANUAL', 'FILTER'] },
  storyIds: { ...array(uuid), minItems: 1, maxItems: 20, uniqueItems: true },
  genres: { ...array({ ...string, minLength: 1 }), maxItems: 10 },
  originalOnly: bool,
  sort: { ...string, enum: ['popular', 'latest', 'likes', 'chats'] },
  itemLimit: { type: 'integer', minimum: 1, maximum: 20 },
  isActive: bool,
  sortOrder: { type: 'integer', minimum: 1, maximum: 2147483647 },
  reason,
};
const section = {
  id: uuid,
  name: string,
  source: properties.source,
  stories: array({
    type: 'object',
    required: ['storyId', 'title', 'isListed'],
    properties: { storyId: uuid, title: string, isListed: bool },
  }),
  genres: array(string),
  originalOnly: bool,
  sort: {
    type: ['string', 'null'],
    enum: ['popular', 'latest', 'likes', 'chats', null],
  },
  itemLimit: { type: 'integer' },
  isActive: bool,
  sortOrder: { type: 'integer' },
  createdAt: string,
  updatedAt: string,
};

Object.assign(document.components.schemas, {
  HomeSection: {
    type: 'object',
    required: Object.keys(section),
    properties: section,
  },
  HomeSectionCreate: {
    type: 'object',
    required: ['name', 'source', 'reason'],
    properties,
  },
  HomeSectionUpdate: { type: 'object', required: ['reason'], properties },
  HomeSectionDelete: {
    type: 'object',
    required: ['reason'],
    properties: { reason },
  },
});

const root = document.paths['/api/v1/admin/home-sections'];
const item = document.paths['/api/v1/admin/home-sections/{sectionId}'];

for (const [operation, bodyName, status, responseSchema] of [
  [
    root.get,
    null,
    '200',
    {
      type: 'object',
      required: ['items'],
      properties: { items: array(ref('HomeSection')) },
    },
  ],
  [root.post, 'HomeSectionCreate', '201', ref('HomeSection')],
  [item.patch, 'HomeSectionUpdate', '200', ref('HomeSection')],
  [item.delete, 'HomeSectionDelete', '204', null],
]) {
  if (bodyName)
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: ref(bodyName) } },
    };

  if (responseSchema)
    operation.responses[status].content = {
      'application/json': { schema: responseSchema },
    };
}

document['x-contract-overlay'] ??= {};
document['x-contract-overlay'].homeSections = {
  source: 'knk-harness STORY/BACKEND 4-2-35~4-2-38, ADMIN/WEB 3-1',
  server: 'https://github.com/KIM-N-KANG/manyak-server/pull/461',
  revision: '07774c585ae26b77a1f67cbdf371f204828a24ac',
  reason:
    '실제 OpenAPI의 ObjectNode 요청과 응답에 필드 스키마가 없어 계약으로 보완했다. 서버 머지 후 api:generate 재실행 필요',
};
await writeFile(path, JSON.stringify(document, null, 2) + '\n');
