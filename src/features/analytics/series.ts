import { modelLabel } from './config';

export type Series = {
  key: string;
  label: string;
  color: string;
  dash?: string;
};

const muted = 'var(--muted-foreground)';
const dashes = [undefined, '6 3', '2 3', '8 3 2 3'];
const colors = Array.from({ length: 5 }, (_, i) => `var(--chart-${i + 1})`);

function fixed(
  entries: [string, string][],
  palette: string[] = colors,
): Series[] {
  return entries.map(([key, label], i) => ({
    key,
    label,
    color: palette[i] ?? muted,
    dash: dashes[i % 4],
  }));
}

export const seriesGroups = {
  platform: fixed(
    [
      ['all', '전체'],
      ['web', '웹'],
      ['android', '앱'],
      ['unknown', '플랫폼 없음'],
    ],
    colors,
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
  ]),
  owner: fixed(
    [
      ['all', '전체'],
      ['guest', '게스트'],
      ['member', '회원'],
    ],
    colors,
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
  return fixed(entries, colors);
}

export function modelSeries(codes: string[]): Series[] {
  const unique = [...new Set(codes)];
  const unknown = unique
    .filter((code) => !['AURORA', 'LITE', 'UNRECORDED'].includes(code))
    .toSorted();
  const ordered = ['AURORA', 'LITE', ...unknown, 'UNRECORDED'].filter((code) =>
    unique.includes(code),
  );
  const modelColors = new Map([
    ['AURORA', colors[0]],
    ['LITE', colors[1]],
  ]);

  return ordered.map((key, index) => ({
    key,
    label: modelLabel(key),
    color: modelColors.get(key) ?? muted,
    dash: dashes[index % 4],
  }));
}

const featureOrder = [
  'chat_response',
  'choice_generation',
  'chat_image',
  'storyline_generation',
  'story_completion',
];

export function featureColor(code: string) {
  const index = featureOrder.indexOf(code);

  return index < 0 ? muted : colors[index];
}
export function featureSeries(entries: [string, string][]): Series[] {
  return listedSeries(entries).map((series) => ({
    ...series,
    color: featureColor(series.key),
    dash: dashes[Math.max(0, featureOrder.indexOf(series.key)) % 4],
  }));
}
