const javaNonBlank = '(?sU).*\\S.*';
// Java UNICODE_CHARACTER_CLASS의 White_Space와 DOTALL 의미를 플래그 없는 ECMAScript 문자 클래스로 옮긴다.
const ecmaNonBlank = String.raw`[\s\S]*[^\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000][\s\S]*`;

/** 원본 스냅샷은 보존하고 생성 입력의 Java 정규식 표기만 변환한다. */
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

  visit(result);

  return result;
}
