import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { createKeyboardTestHelpers } from './story-takedown-helpers.mjs';

const script = readFileSync(
  new URL('./story-takedown-keyboard.js', import.meta.url),
  'utf8',
);
const prelude = `const { assertSinglePost, waitForResult } = (${createKeyboardTestHelpers.toString()})();`;
const output = execFileSync('aside', ['repl', `${prelude}\n${script}`], {
  encoding: 'utf8',
  timeout: 120_000,
  maxBuffer: 1024 * 1024,
});

process.stdout.write(output);

// REPL이 스크립트 오류에도 종료 0을 반환할 수 있어 Enter 시나리오 완료 표식을 검사한다.
if (!output.includes('PASS keyboard Enter:'))
  throw new Error('Enter 키보드 시나리오가 완료되지 않았다.');
