/**
 * Codex 훅 입력에서 편집 대상 파일 경로를 추출한다.
 *
 * Codex는 파일 편집을 `apply_patch` 도구로 넘기며 `tool_input.file_path`를 주지 않는다.
 * 대신 패치 본문의 `*** Update File: <경로>` / `*** Add File:` / `*** Move to:` 헤더에서 경로를 뽑는다.
 * (Edit/Write처럼 `tool_input.file_path`가 있으면 그것도 함께 사용한다.)
 *
 * @param {{ tool_input?: unknown }} input 훅 stdin JSON
 * @returns {string[]} 편집 대상 파일 경로(cwd 기준 상대 또는 절대, 원문 그대로)
 */
export function extractEditedPaths(input) {
  const paths = new Set();

  const fp = input && input.tool_input && input.tool_input.file_path;

  if (typeof fp === 'string' && fp) paths.add(fp);

  const text = patchText(input && input.tool_input);
  const re = /\*\*\* (?:Update File|Add File|Move to): ([^\r\n\\]+)/g;
  let m = re.exec(text);

  while (m !== null) {
    const p = m[1].trim();

    if (p) paths.add(p);

    m = re.exec(text);
  }

  return [...paths];
}

function patchText(toolInput) {
  if (typeof toolInput === 'string') return toolInput;

  if (toolInput && typeof toolInput === 'object') {
    if (typeof toolInput.input === 'string') return toolInput.input;

    if (typeof toolInput.patch === 'string') return toolInput.patch;

    return JSON.stringify(toolInput);
  }

  return '';
}
