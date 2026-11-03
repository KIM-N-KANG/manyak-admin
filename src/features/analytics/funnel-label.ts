function labelWidth(text: string) {
  // 11px 글자의 한글은 1em, 영문·숫자는 0.6em, 공백은 0.3em으로 너비를 추정한다.
  return [...text].reduce(
    (sum, char) =>
      sum + (char === ' ' ? 0.3 : char.codePointAt(0)! < 128 ? 0.6 : 1) * 11,
    0,
  );
}

export function wrapFunnelLabel(label: string, maxWidth = 100): string[] {
  const words = label.trim().split(/\s+/u);
  const text = words.join(' ');

  if (labelWidth(text) <= maxWidth) return [text];

  let complete: { lines: string[]; balance: number } | undefined;
  let clipped: { lines: string[]; kept: number; balance: number } | undefined;

  for (let split = 1; split < words.length; split++) {
    const first = words.slice(0, split).join(' ');

    if (labelWidth(first) > maxWidth) break;

    const second = words.slice(split).join(' ');
    const balance = Math.abs(labelWidth(first) - labelWidth(second));

    if (labelWidth(second) <= maxWidth) {
      if (!complete || balance < complete.balance)
        complete = { lines: [first, second], balance };

      continue;
    }

    const last: string[] = [];

    for (const word of words.slice(split)) {
      if (labelWidth([...last, word].join(' ') + '…') > maxWidth) break;

      last.push(word);
    }

    const line = last.join(' ') + '…';
    const candidate = {
      lines: [first, line],
      kept: split + last.length,
      balance: Math.abs(labelWidth(first) - labelWidth(line)),
    };

    if (
      !clipped ||
      candidate.kept > clipped.kept ||
      (candidate.kept === clipped.kept && candidate.balance < clipped.balance)
    )
      clipped = candidate;
  }

  return complete?.lines ?? clipped?.lines ?? ['…'];
}
