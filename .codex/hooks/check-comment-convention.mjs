#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  analyzeSource,
  filterByChangedLines,
  shouldCheckFile,
} from '../../tools/comment-convention/analyze.mjs';
import { extractEditedPaths } from '../../tools/comment-convention/apply-patch.mjs';
import { changedLines } from '../../tools/comment-convention/git-diff.mjs';

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) chunks.push(chunk);

  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const raw = await readStdin();
  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const cwd = (input && input.cwd) || process.cwd();
  const lines = [];

  for (const rel of extractEditedPaths(input)) {
    const abs = path.isAbsolute(rel) ? rel : path.resolve(cwd, rel);

    if (!shouldCheckFile(abs)) continue;

    let source;

    try {
      source = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    let violations;

    try {
      violations = analyzeSource(source, abs);
    } catch {
      continue;
    }

    if (!violations.length) continue;

    let filtered = violations;

    try {
      filtered = filterByChangedLines(violations, changedLines(abs, cwd));
    } catch {
      filtered = violations;
    }

    const relPath = path.relative(cwd, abs) || abs;

    for (const v of filtered) lines.push(`${relPath}:${v.line} — ${v.message}`);
  }

  if (!lines.length) process.exit(0);

  const reason = [
    '주석 컨벤션 위반이 발견되었습니다. 아래 항목을 수정하세요:',
    '',
    ...lines,
  ].join('\n');

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
}

main().catch(() => process.exit(0));
