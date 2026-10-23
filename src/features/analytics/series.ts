export type Series = {
  key: string;
  label: string;
  color: string;
  dash?: string;
};

const primary = 'var(--primary)';
const muted = 'var(--muted-foreground)';
const deep = 'var(--primary-text)';
const dashes = [undefined, '6 3', '2 3', '8 3 2 3'];
const colors = [primary, deep, muted, 'var(--chart-3)', 'var(--chart-5)'];

function fixed(
  entries: [string, string][],
  palette: string[] = colors,
): Series[] {
  return entries.map(([key, label], i) => ({
    key,
    label,
    color: palette[i],
    dash: dashes[i % 4],
  }));
}

export const seriesGroups = {
  platform: fixed(
    [
      ['all', '전체'],
      ['web', 'Web'],
      ['android', 'Android'],
      ['unknown', '플랫폼 없음'],
    ],
    [primary, muted, deep, 'var(--chart-3)'],
  ),
  ads: fixed([
    ['all', '전체'],
    ['ads', '광고 유입'],
    ['nonAds', '광고 외 유입'],
  ]),
  source: fixed([
    ['ads', '광고 유입'],
    ['instagram', '인스타그램'],
    ['threads', '쓰레드'],
    ['dcinside', '디시인사이드'],
    ['other', '그 밖'],
  ]),
  signup: fixed([
    ['total', '전체'],
    ['google', '구글'],
    ['kakao', '카카오'],
    ['other', '그 외'],
  ]),
  owner: fixed(
    [
      ['all', '전체'],
      ['guest', '게스트'],
      ['member', '회원'],
    ],
    [primary, muted, deep],
  ),
  input: fixed([
    ['block', '블럭 입력'],
    ['plain', '일반 입력'],
    ['choice', '선택지'],
    ['unknown', '방식 정보 없음'],
  ]),
};
export function listedSeries(entries: [string, string][]): Series[] {
  return entries.map(([key, label], i) => ({
    key,
    label,
    color: i < 5 ? `var(--chart-${i + 1})` : muted,
    dash: dashes[i % 4],
  }));
}
export function pairSeries(entries: [string, string][]): Series[] {
  return fixed(entries, [primary, muted]);
}
