import { execFileSync } from 'node:child_process';
import process from 'node:process';

import { parseChangedLines } from './analyze.mjs';

/**
 * 파일이 HEAD 대비 변경된 라인 번호를 구한다.
 *
 * @param {string} filePath 대상 파일 경로
 * @param {string} [projectDir] git 실행 기준 디렉터리
 * @returns {Set<number>|null} 변경 라인 집합. 미추적 파일이나 git 실패 시 null(전체 검사 폴백)
 */
export function changedLines(filePath, projectDir) {
  try {
    const cwd = projectDir || process.cwd();
    const status = execFileSync(
      'git',
      ['-C', cwd, 'status', '--porcelain', '--', filePath],
      { encoding: 'utf8' },
    );

    if (/^\?\?/m.test(status)) return null;

    const diff = execFileSync(
      'git',
      ['-C', cwd, 'diff', '--unified=0', '--no-color', 'HEAD', '--', filePath],
      { encoding: 'utf8' },
    );

    return parseChangedLines(diff);
  } catch {
    return null;
  }
}
