/** 실제 스냅샷은 보존하고 서버 DTO에 빠진 STORY 계약 조건만 생성 입력에 보완한다. */
export function applyHomeSectionsOverlay(document) {
  if (!document.paths?.['/api/v1/admin/home-sections']) return document;

  const schemas = document.components.schemas;

  for (const name of [
    'HomeSectionListResponse',
    'HomeSectionResponse',
    'HomeSectionStoryResponse',
  ]) {
    schemas[name].required = Object.keys(schemas[name].properties);
  }

  for (const name of ['HomeSectionCreateRequest', 'HomeSectionUpdateRequest']) {
    const fields = schemas[name].properties;

    for (const field of Object.values(fields)) {
      if (Array.isArray(field.type)) {
        field.type = field.type.filter((type) => type !== 'null');
      }
    }

    Object.assign(fields.storyIds, {
      minItems: 1,
      maxItems: 20,
      uniqueItems: true,
      items: { type: 'string', format: 'uuid' },
    });
    Object.assign(fields.genres, {
      maxItems: 10,
      items: { type: 'string', minLength: 1 },
    });
    fields.name['x-trim'] = true;
    fields.itemLimit.type = 'integer';
    fields.sortOrder.type = 'integer';
    fields.name.pattern = '[\\s\\S]*\\S[\\s\\S]*';
  }

  for (const name of [
    'HomeSectionCreateRequest',
    'HomeSectionUpdateRequest',
    'HomeSectionDeleteRequest',
  ]) {
    schemas[name].properties.reason.pattern = '[\\s\\S]*\\S[\\s\\S]*';
  }

  return document;
}
