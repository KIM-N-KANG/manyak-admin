import { describe, expect, it } from 'vitest';

import {
  analyzeSource,
  filterByChangedLines,
  formatViolations,
  parseChangedLines,
  shouldCheckFile,
} from '../../tools/comment-convention/analyze.mjs';

describe('shouldCheckFile', () => {
  it('src 아래 .ts / .tsx 는 검사한다', () => {
    expect(shouldCheckFile('/repo/src/features/a/utils/x.ts')).toBe(true);
    expect(shouldCheckFile('/repo/src/features/a/components/x.tsx')).toBe(true);
  });

  it('생성 코드/테스트/비대상 확장자는 제외한다', () => {
    expect(shouldCheckFile('/repo/src/api/generated/endpoints/x.ts')).toBe(
      false,
    );
    expect(shouldCheckFile('/repo/src/features/a/x.test.ts')).toBe(false);
    expect(shouldCheckFile('/repo/e2e/flow.spec.ts')).toBe(false);
    expect(shouldCheckFile('/repo/tests/lib/x.test.ts')).toBe(false);
    expect(shouldCheckFile('/repo/src/app/globals.css')).toBe(false);
    expect(shouldCheckFile('/repo/README.md')).toBe(false);
  });
});

describe('analyzeSource - 컴포넌트 주석 금지', () => {
  it('주석 없는 컴포넌트는 통과', () => {
    const src = `export function StoryCard() {\n  return <div />;\n}`;

    expect(
      analyzeSource(src, 'src/features/a/components/story-card.tsx'),
    ).toEqual([]);
  });

  it('컴포넌트 위 설명 주석은 위반', () => {
    const src = `// 스토리 카드\nexport function StoryCard() {\n  return <div />;\n}`;
    const v = analyzeSource(src, 'src/features/a/components/story-card.tsx');

    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('component-comment');
    expect(v[0].name).toBe('StoryCard');
  });

  it('컴포넌트 위 도구 지시자 주석은 허용', () => {
    const src = `// eslint-disable-next-line react/display-name\nexport const Row = () => <div />;`;

    expect(analyzeSource(src, 'src/features/a/components/row.tsx')).toEqual([]);
  });

  it('컴포넌트 내부 주석은 위반', () => {
    const src = `export function Card() {\n  // 내부 설명\n  return <div />;\n}`;
    const v = analyzeSource(src, 'src/features/a/components/card.tsx');

    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('component-comment');
  });

  it('PascalCase 화살표 / forwardRef 도 컴포넌트로 본다', () => {
    const arrow = `/** 카드 */\nexport const Card = () => <div />;`;

    expect(analyzeSource(arrow, 'src/a/components/card.tsx')[0].kind).toBe(
      'component-comment',
    );

    const fwd = `/** 인풋 */\nexport const Input = forwardRef((p, ref) => <input ref={ref} />);`;

    expect(analyzeSource(fwd, 'src/a/components/input.tsx')[0].kind).toBe(
      'component-comment',
    );
  });

  it('컴포넌트 위 도구 지시자 뒤에 숨은 설명 주석도 위반', () => {
    const src = `// TODO: 리팩터링 필요\n// eslint-disable-next-line react/display-name\nexport const Foo = () => <div />;`;
    const v = analyzeSource(src, 'src/a/components/foo.tsx');

    expect(v).toHaveLength(1);
    expect(v[0].kind).toBe('component-comment');
  });
});

describe('analyzeSource - 훅/유틸 JSDoc', () => {
  it('완전한 JSDoc 유틸은 통과', () => {
    const src = [
      '/**',
      ' * 날짜를 포맷한다.',
      ' * @param date 대상 날짜',
      ' * @returns 포맷 문자열',
      ' */',
      'export function formatDate(date: Date): string {',
      '  return String(date);',
      '}',
    ].join('\n');

    expect(analyzeSource(src, 'src/a/utils/format.ts')).toEqual([]);
  });

  it('JSDoc 없는 유틸은 missing-jsdoc', () => {
    const src = `export function formatDate(date: Date): string {\n  return String(date);\n}`;
    const v = analyzeSource(src, 'src/a/utils/format.ts');

    expect(v.map((x) => x.kind)).toContain('missing-jsdoc');
  });

  it('@param 누락은 missing-param', () => {
    const src = [
      '/**',
      ' * 더한다.',
      ' * @returns 합',
      ' */',
      'export function add(a: number, b: number): number {',
      '  return a + b;',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/add.ts');

    expect(v.filter((x) => x.kind === 'missing-param')).toHaveLength(2);
  });

  it('값 반환인데 @returns 누락은 missing-returns', () => {
    const src = [
      '/**',
      ' * 하나 증가.',
      ' * @param a 입력',
      ' */',
      'export const inc = (a: number) => a + 1;',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/inc.ts');

    expect(v.map((x) => x.kind)).toContain('missing-returns');
  });

  it('throw 있는데 @throws 누락은 missing-throws', () => {
    const src = [
      '/**',
      ' * 검증.',
      ' * @param ok 여부',
      ' */',
      'export function assertOk(ok: boolean): void {',
      '  if (!ok) throw new Error("no");',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/assert.ts');

    expect(v.map((x) => x.kind)).toContain('missing-throws');
  });

  it('use 훅도 JSDoc 필수', () => {
    const src = `export function useThing() {\n  return 1;\n}`;
    const v = analyzeSource(src, 'src/a/hooks/use-thing.ts');

    expect(v.map((x) => x.kind)).toContain('missing-jsdoc');
  });

  it('컴포넌트 내부 핸들러는 JSDoc 요구하지 않는다', () => {
    const src = [
      'export function Card() {',
      '  const handleClick = (e: unknown) => { console.log(e); };',
      '  return <button onClick={handleClick} />;',
      '}',
    ].join('\n');

    expect(analyzeSource(src, 'src/a/components/card.tsx')).toEqual([]);
  });

  it('제외 경로는 위반 코드라도 통과 (shouldCheckFile 게이트)', () => {
    expect(shouldCheckFile('src/api/generated/x.ts')).toBe(false);
  });

  it('중첩 객체 메서드의 return은 유틸의 @returns를 요구하지 않는다', () => {
    const src = [
      '/**',
      ' * 설명.',
      ' * @param a 입력',
      ' */',
      'export function util(a) {',
      '  const obj = { method() { return 5; } };',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/util.ts');

    expect(v).toEqual([]);
  });

  it('중첩 객체 메서드의 throw는 유틸의 @throws를 요구하지 않는다', () => {
    const src = [
      '/**',
      ' * 설명.',
      ' * @param a 입력',
      ' * @returns 객체',
      ' */',
      'export function build(a) {',
      '  const obj = { method() { throw new Error("x"); } };',
      '  return obj;',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/build.ts');

    expect(v.map((x) => x.kind)).not.toContain('missing-throws');
  });
});

describe('analyzeSource - Minor 하드닝', () => {
  it('지시자처럼 시작하지만 다른 단어(eslint-enablement)는 지시자가 아니라 위반', () => {
    const src = `// eslint-enablement 메모\nexport function Card() {\n  return <div />;\n}`;
    const v = analyzeSource(src, 'src/a/components/card.tsx');

    expect(v.filter((x) => x.kind === 'component-comment')).toHaveLength(1);
  });

  it('Promise< void > 처럼 공백 있는 void 반환은 @returns를 요구하지 않는다', () => {
    const src = [
      '/**',
      ' * 대기.',
      ' * @param ms 밀리초',
      ' */',
      'export async function wait(ms: number): Promise< void > {',
      '  return undefined;',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/wait.ts');

    expect(v.map((x) => x.kind)).not.toContain('missing-returns');
  });

  it('Promise<string> 반환은 여전히 @returns를 요구한다', () => {
    const src = [
      '/**',
      ' * 조회.',
      ' * @param id 아이디',
      ' */',
      'export async function load(id: string): Promise<string> {',
      '  return id;',
      '}',
    ].join('\n');
    const v = analyzeSource(src, 'src/a/utils/load.ts');

    expect(v.map((x) => x.kind)).toContain('missing-returns');
  });

  it('다중 선언문에서 sibling 유틸의 내부 주석을 컴포넌트에 오귀속하지 않는다', () => {
    const src = `export const A = () => <div />, make = () => { /* note */ return 1; };`;
    const v = analyzeSource(src, 'src/a/components/a.tsx');

    expect(v.filter((x) => x.kind === 'component-comment')).toEqual([]);
  });
});

describe('formatViolations', () => {
  it('파일:라인 — 메시지 형태로 합친다', () => {
    const out = formatViolations(
      [
        {
          line: 3,
          kind: 'missing-returns',
          name: 'add',
          message: '유틸 함수 `add` JSDoc에 @returns 누락.',
        },
      ],
      'src/a/utils/add.ts',
    );

    expect(out).toContain(
      'src/a/utils/add.ts:3 — 유틸 함수 `add` JSDoc에 @returns 누락.',
    );
  });
});

describe('parseChangedLines', () => {
  it('+ 훙크의 추가 라인 번호를 모은다', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      '@@ -1,0 +4,3 @@',
      '+a',
      '+b',
      '+c',
      '@@ -10 +20 @@',
      '+d',
    ].join('\n');
    const s = parseChangedLines(diff);

    expect([...s].sort((a, b) => a - b)).toEqual([4, 5, 6, 20]);
  });
});

describe('filterByChangedLines', () => {
  const vs = [
    {
      line: 2,
      kind: 'missing-jsdoc',
      name: 'old',
      message: 'x',
      declStart: 1,
      declEnd: 3,
    },
    {
      line: 6,
      kind: 'missing-jsdoc',
      name: 'neu',
      message: 'y',
      declStart: 5,
      declEnd: 7,
    },
  ];

  it('changed가 null이면 그대로 반환', () => {
    expect(filterByChangedLines(vs, null)).toHaveLength(2);
  });
  it('선언 스팬이 변경 라인과 교차하는 위반만 남긴다', () => {
    const out = filterByChangedLines(vs, new Set([6]));

    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('neu');
  });
});

describe('analyzeSource - 선언 스팬', () => {
  it('위반에 declStart/declEnd를 포함한다', () => {
    const src = `export function add(a) {\n  return a;\n}`;
    const v = analyzeSource(src, 'src/a/utils/add.ts');

    expect(v[0]).toMatchObject({ kind: 'missing-jsdoc' });
    expect(typeof v[0].declStart).toBe('number');
    expect(typeof v[0].declEnd).toBe('number');
  });
});
