const javaNonBlank = '(?sU).*\\S.*';
// Java UNICODE_CHARACTER_CLASS의 White_Space와 DOTALL 의미를 플래그 없는 ECMAScript 문자 클래스로 옮긴다.
const ecmaNonBlank = String.raw`[\s\S]*[^\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000][\s\S]*`;

/** 원본 스냅샷은 보존하고 생성 입력의 Java 정규식과 JSON 객체 미디어 표기를 변환한다. */
export default function transformAdminOpenapi(document) {
  const result = structuredClone(document);

  function visit(value) {
    if (!value || typeof value !== 'object') return;

    if (typeof value.pattern === 'string') {
      if (value.pattern === javaNonBlank) value.pattern = ecmaNonBlank;

      // 새로 들어온 미지원 정규식을 조용히 누락하지 않고 생성을 중단한다.
      new RegExp(value.pattern);
    }

    for (const child of Object.values(value)) visit(child);
  }

  for (const [path, methods] of Object.entries(result.paths ?? {})) {
    if (
      !/^\/api\/v1\/admin\/(infra|campaigns|users|quality|conversion|chat-models)(\/|$)/.test(
        path,
      )
    )
      continue;

    for (const operation of Object.values(methods)) {
      for (const response of Object.values(operation.responses ?? {})) {
        const wildcard = response.content?.['*/*'];
        const reference = wildcard?.schema?.$ref;
        const schema = reference
          ? result.components?.schemas?.[reference.split('/').at(-1)]
          : wildcard?.schema;

        // 인프라와 지표, 채팅 모델 JSON 객체 응답의 와일드카드를 Orval이 스키마로 생성할 수 있게 정규화한다.
        if (
          schema?.type === 'object' &&
          !response.content['application/json']
        ) {
          response.content['application/json'] = wildcard;
          delete response.content['*/*'];
        }
      }
    }
  }

  visit(result);

  return result;
}
