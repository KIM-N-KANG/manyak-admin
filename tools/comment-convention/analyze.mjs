import ts from 'typescript';

const DIRECTIVE_RE =
  /^(eslint-disable|eslint-enable|@ts-expect-error|@ts-ignore|@ts-nocheck|biome-ignore)\b/;

/**
 * 훅 검사 대상 파일인지 판별한다.
 *
 * @param {string} fileName 절대 또는 상대 파일 경로
 * @returns {boolean} src 아래 .ts/.tsx 이면서 생성/테스트 코드가 아니면 true
 */
export function shouldCheckFile(fileName) {
  const norm = fileName.replace(/\\/g, '/');

  if (!/\.(ts|tsx)$/.test(norm)) return false;

  if (!norm.includes('/src/')) return false;

  if (norm.includes('/src/api/generated/')) return false;

  if (/\.(test|spec)\.tsx?$/.test(norm)) return false;

  if (norm.includes('/tests/') || norm.includes('/e2e/')) return false;

  return true;
}

function stripComment(text) {
  return text
    .replace(/^\/\/+/, '')
    .replace(/^\/\*+/, '')
    .replace(/\*+\/$/, '')
    .trim();
}

function isDirective(text) {
  return DIRECTIVE_RE.test(stripComment(text));
}

function isOwnLine(sourceText, pos) {
  let i = pos - 1;

  while (i >= 0 && sourceText[i] !== '\n') {
    const ch = sourceText[i];

    if (ch !== ' ' && ch !== '\t' && ch !== '\r') return false;

    i -= 1;
  }

  return true;
}

function isAdjacent(sourceText, commentEnd, nodeStart) {
  const gap = sourceText.slice(commentEnd, nodeStart);

  if (!/^\s*$/.test(gap)) return false;

  return (gap.match(/\n/g) || []).length <= 1;
}

function lineOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function callName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;

  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;

  return '';
}

function isComponentWrapperCall(node) {
  if (!ts.isCallExpression(node)) return false;

  const n = callName(node.expression);

  return n === 'forwardRef' || n === 'memo';
}

function isFunctionLike(node) {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function isFunctionScopeBoundary(n) {
  return (
    ts.isArrowFunction(n) ||
    ts.isFunctionExpression(n) ||
    ts.isFunctionDeclaration(n) ||
    ts.isMethodDeclaration(n) ||
    ts.isGetAccessorDeclaration(n) ||
    ts.isSetAccessorDeclaration(n) ||
    ts.isConstructorDeclaration(n) ||
    ts.isClassDeclaration(n) ||
    ts.isClassExpression(n)
  );
}

function collectDeclarations(stmt) {
  const out = [];

  if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
    out.push({
      name: stmt.name.text,
      fnNode: stmt,
      commentNode: stmt,
      innerNode: stmt,
      checkLeading: true,
      wrapper: false,
    });
  } else if (ts.isVariableStatement(stmt)) {
    let idx = 0;

    for (const d of stmt.declarationList.declarations) {
      const isFirst = idx === 0;

      idx += 1;

      if (!d.name || !ts.isIdentifier(d.name) || !d.initializer) continue;

      const init = d.initializer;

      if (isFunctionLike(init)) {
        out.push({
          name: d.name.text,
          fnNode: init,
          commentNode: stmt,
          innerNode: init,
          checkLeading: isFirst,
          wrapper: false,
        });
      } else if (isComponentWrapperCall(init)) {
        out.push({
          name: d.name.text,
          fnNode: null,
          commentNode: stmt,
          innerNode: init,
          checkLeading: isFirst,
          wrapper: true,
        });
      }
    }
  }

  return out;
}

function containsJsx(node) {
  let found = false;
  const visit = (n) => {
    if (found) return;

    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;

      return;
    }

    if (isFunctionScopeBoundary(n)) return;

    ts.forEachChild(n, visit);
  };

  visit(node);

  return found;
}

function returnsJsx(fn) {
  const body = fn.body;

  if (!body) return false;

  if (!ts.isBlock(body)) return containsJsx(body);

  let found = false;
  const visit = (n) => {
    if (found) return;

    if (isFunctionScopeBoundary(n)) return;

    if (ts.isReturnStatement(n) && n.expression && containsJsx(n.expression)) {
      found = true;

      return;
    }

    ts.forEachChild(n, visit);
  };

  ts.forEachChild(body, visit);

  return found;
}

function classify(decl) {
  if (decl.wrapper) return 'component';

  const fn = decl.fnNode;

  if (!fn) return 'other';

  if (returnsJsx(fn)) return 'component';

  if (/^[A-Z]/.test(decl.name)) return 'component';

  if (/^use[A-Z]/.test(decl.name)) return 'hook';

  return 'util';
}

function leadingComments(node, sourceText) {
  return ts.getLeadingCommentRanges(sourceText, node.getFullStart()) || [];
}

function innerComments(node, sourceText, sf) {
  const start = node.getStart(sf);
  const end = node.getEnd();
  const seen = new Map();
  const collect = (ranges) => {
    for (const r of ranges || []) {
      if (r.pos > start && r.end < end) seen.set(r.pos, r);
    }
  };
  const visit = (n) => {
    collect(ts.getLeadingCommentRanges(sourceText, n.getFullStart()));
    collect(ts.getTrailingCommentRanges(sourceText, n.getEnd()));
    ts.forEachChild(n, visit);
  };

  ts.forEachChild(node, visit);

  return [...seen.values()];
}

function checkComponent(decl, sourceText, sf, violations) {
  const node = decl.commentNode;
  const nodeStart = node.getStart(sf);
  const before = violations.length;

  if (decl.checkLeading) {
    const leads = leadingComments(node, sourceText);
    let nextStart = nodeStart;

    for (let idx = leads.length - 1; idx >= 0; idx -= 1) {
      const r = leads[idx];

      if (
        !isOwnLine(sourceText, r.pos) ||
        !isAdjacent(sourceText, r.end, nextStart)
      )
        break;

      const text = sourceText.slice(r.pos, r.end);

      if (!isDirective(text)) {
        violations.push({
          line: lineOf(sf, r.pos),
          kind: 'component-comment',
          name: decl.name,
          message: `컴포넌트 \`${decl.name}\` 위의 설명 주석을 제거하세요 (도구 지시자 외 주석 금지).`,
        });
      }

      nextStart = r.pos;
    }
  }

  for (const r of innerComments(decl.innerNode, sourceText, sf)) {
    const text = sourceText.slice(r.pos, r.end);

    if (isDirective(text)) continue;

    violations.push({
      line: lineOf(sf, r.pos),
      kind: 'component-comment',
      name: decl.name,
      message: `컴포넌트 \`${decl.name}\` 내부의 주석을 제거하세요 (도구 지시자 외 주석 금지).`,
    });
  }

  const declStart = lineOf(sf, nodeStart);
  const declEnd = lineOf(sf, node.getEnd());

  for (let i = before; i < violations.length; i += 1) {
    violations[i].declStart = declStart;
    violations[i].declEnd = declEnd;
  }
}

function getJsDoc(node) {
  const arr = node.jsDoc;

  if (!arr || !arr.length) return null;

  return arr[arr.length - 1];
}

function jsDocDescription(jsDoc) {
  const c = jsDoc.comment;

  if (!c) return '';

  return typeof c === 'string'
    ? c.trim()
    : c
        .map((p) => p.text || '')
        .join('')
        .trim();
}

function jsDocParamNames(jsDoc) {
  const names = [];

  for (const t of jsDoc.tags || []) {
    if (t.tagName && t.tagName.text === 'param') {
      names.push(t.name ? t.name.getText() : null);
    }
  }

  return names;
}

function jsDocHasTag(jsDoc, tagNames) {
  return (jsDoc.tags || []).some(
    (t) => t.tagName && tagNames.includes(t.tagName.text),
  );
}

function isVoidLikeType(typeText) {
  const norm = typeText.replace(/\s/g, '');
  const VOID = new Set(['void', 'undefined', 'never']);
  const inner = norm.replace(/^Promise<(.+)>$/, '$1');

  return inner.split('|').every((m) => VOID.has(m));
}

function returnsValue(fn) {
  if (fn.type) {
    return !isVoidLikeType(fn.type.getText());
  }

  if (ts.isArrowFunction(fn) && fn.body && !ts.isBlock(fn.body)) return true;

  let has = false;
  const visit = (n) => {
    if (has) return;

    if (isFunctionScopeBoundary(n)) return;

    if (ts.isReturnStatement(n) && n.expression) {
      has = true;

      return;
    }

    ts.forEachChild(n, visit);
  };

  if (fn.body) ts.forEachChild(fn.body, visit);

  return has;
}

function throwsError(fn) {
  let has = false;
  const visit = (n) => {
    if (has) return;

    if (isFunctionScopeBoundary(n)) return;

    if (ts.isThrowStatement(n)) {
      has = true;

      return;
    }

    ts.forEachChild(n, visit);
  };

  if (fn.body) ts.forEachChild(fn.body, visit);

  return has;
}

function checkDocumented(decl, kind, sf, violations) {
  const fn = decl.fnNode;
  const line = lineOf(sf, decl.commentNode.getStart(sf));
  const declStart = line;
  const declEnd = lineOf(sf, decl.commentNode.getEnd());
  const before = violations.length;
  const label = kind === 'hook' ? '훅' : '유틸 함수';
  const namedParams = fn.parameters
    .filter((p) => ts.isIdentifier(p.name))
    .map((p) => p.name.text);
  const paramCount = fn.parameters.length;
  const destructuredCount = paramCount - namedParams.length;
  const needReturns = returnsValue(fn);
  const needThrows = throwsError(fn);
  const jsDoc = getJsDoc(decl.commentNode);

  if (!jsDoc) {
    const req = ['설명'];

    if (paramCount) req.push('@param');

    if (needReturns) req.push('@returns');

    if (needThrows) req.push('@throws');

    violations.push({
      line,
      declStart,
      declEnd,
      kind: 'missing-jsdoc',
      name: decl.name,
      message: `${label} \`${decl.name}\`에 JSDoc이 없습니다 (${req.join(' + ')} 필요).`,
    });

    return;
  }

  if (!jsDocDescription(jsDoc)) {
    violations.push({
      line,
      kind: 'missing-description',
      name: decl.name,
      message: `${label} \`${decl.name}\` JSDoc에 설명 문장이 없습니다.`,
    });
  }

  const paramTags = jsDocParamNames(jsDoc);

  for (const pName of namedParams) {
    if (!paramTags.includes(pName)) {
      violations.push({
        line,
        kind: 'missing-param',
        name: decl.name,
        message: `${label} \`${decl.name}\` JSDoc에 @param ${pName} 누락.`,
      });
    }
  }

  if (destructuredCount > 0 && paramTags.length < paramCount) {
    violations.push({
      line,
      kind: 'missing-param',
      name: decl.name,
      message: `${label} \`${decl.name}\` JSDoc @param 개수 부족 (파라미터 ${paramCount}개).`,
    });
  }

  if (needReturns && !jsDocHasTag(jsDoc, ['returns', 'return'])) {
    violations.push({
      line,
      kind: 'missing-returns',
      name: decl.name,
      message: `${label} \`${decl.name}\` JSDoc에 @returns 누락.`,
    });
  }

  if (needThrows && !jsDocHasTag(jsDoc, ['throws', 'exception'])) {
    violations.push({
      line,
      kind: 'missing-throws',
      name: decl.name,
      message: `${label} \`${decl.name}\` JSDoc에 @throws 누락.`,
    });
  }

  for (let i = before; i < violations.length; i += 1) {
    violations[i].declStart = declStart;
    violations[i].declEnd = declEnd;
  }
}

/**
 * 소스 텍스트를 AST 파싱해 주석 컨벤션 위반 목록을 반환한다.
 *
 * @param {string} sourceText 검사할 소스 코드 전체
 * @param {string} fileName 파일명 (확장자로 TS/TSX 판별에 사용)
 * @returns {Array<{ line: number, kind: string, name: string, message: string, declStart: number, declEnd: number }>} 라인 오름차순 위반 목록
 */
export function analyzeSource(sourceText, fileName) {
  const isTsx = /\.tsx$/.test(fileName);
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations = [];

  for (const stmt of sf.statements) {
    for (const decl of collectDeclarations(stmt)) {
      const kind = classify(decl);

      if (kind === 'component')
        checkComponent(decl, sourceText, sf, violations);
      else if (kind === 'hook' || kind === 'util')
        checkDocumented(decl, kind, sf, violations);
    }
  }

  return violations.sort((a, b) => a.line - b.line);
}

/**
 * 위반 목록을 훅 reason 문자열로 변환한다.
 *
 * @param {Array<{ line: number, kind: string, name: string, message: string }>} violations 위반 목록
 * @param {string} relPath 리포트에 표시할 상대 경로
 * @returns {string} Claude에게 전달할 안내 텍스트
 */
export function formatViolations(violations, relPath) {
  const lines = violations.map((v) => `${relPath}:${v.line} — ${v.message}`);

  return [
    '주석 컨벤션 위반이 발견되었습니다. 아래 항목을 수정하세요:',
    '',
    ...lines,
  ].join('\n');
}

/**
 * unified diff 텍스트에서 새 파일 기준으로 추가된 라인 번호를 모은다.
 *
 * @param {string} diffText `git diff --unified=0` 출력
 * @returns {Set<number>} 추가된 라인 번호 집합
 */
export function parseChangedLines(diffText) {
  const changed = new Set();
  const re = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
  let m = re.exec(diffText);

  while (m !== null) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);

    for (let i = 0; i < count; i += 1) changed.add(start + i);

    m = re.exec(diffText);
  }

  return changed;
}

/**
 * 변경된 라인과 선언 스팬이 교차하는 위반만 남긴다.
 *
 * @param {Array<{ line: number, name?: string, declStart?: number, declEnd?: number }>} violations 위반 목록
 * @param {Set<number>|null} changed 변경 라인 집합. null이면 필터하지 않음
 * @returns {Array<{ line: number, name?: string, declStart?: number, declEnd?: number }>} 걸러진 위반 목록
 */
export function filterByChangedLines(violations, changed) {
  if (changed === null) return violations;

  return violations.filter((v) => {
    const lo = Math.min(v.line, v.declStart ?? v.line);
    const hi = v.declEnd ?? v.line;

    for (let ln = lo; ln <= hi; ln += 1) {
      if (changed.has(ln)) return true;
    }

    return false;
  });
}
