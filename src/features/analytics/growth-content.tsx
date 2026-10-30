'use client';

import { Charts, dailyRows } from './charts';
import { eventLabel, metricNumber as n, percent } from './config';
import { FunnelChart, NumericTable, SummaryCards } from './metric-ui';
import { pairSeries } from './series';
import type * as T from './types';

const single = (key: string, label: string) => pairSeries([[key, label]]);

/** 캠페인의 활성화, 누적 도달, 소재와 앱 유입 응답을 표시한다. */
export function GrowthContent({
  tab,
  data,
  segment,
}: {
  tab: string;
  data: unknown;
  segment: string;
}) {
  const key = segment as keyof T.CampaignSegments;

  if (tab === 'activation') {
    const d = data as T.CampaignActivationResponse;

    return (
      <FunnelChart
        definitionTitle="첫 방문 활성화 퍼널"
        steps={d.steps.map((step) => ({ ...step, users: step.users[key] }))}
        extraTable={
          <NumericTable
            headers={['단계', '전체', '광고 유입', '광고 외 유입']}
            rows={d.steps.map((step, i) => [
              eventLabel(step.event, null, step.minTurnNumber),
              ...(['all', 'ads', 'nonAds'] as const).map(
                (segment) =>
                  `${n(step.users[segment], '명')}${i ? ` (${percent(d.steps[i - 1].users[segment] ? step.users[segment] / d.steps[i - 1].users[segment] : null)})` : ''}`,
              ),
            ])}
          />
        }
      />
    );
  }

  if (tab === 'reach') {
    const d = data as T.CampaignReachResponse;

    return (
      <SummaryCards
        items={[
          {
            label: '채팅 메시지 전송 사용자',
            value: n(d.chatUsers[key], '명'),
          },
          {
            label: '5턴 이상 채팅 사용자',
            value: n(d.deepChatUsers[key], '명'),
          },
        ]}
      />
    );
  }

  if (tab === 'creatives') {
    const d = data as T.CampaignCreativesResponse;
    const contents = orderedKeys(
      d.totals.signups.map((row) => row.content),
      d.daily.flatMap((day) =>
        [...day.signups, ...day.deepChatUsers].map((row) => row.content),
      ),
    );
    const series = dynamicSeries(contents, '소재 정보 없음');

    return (
      <>
        <Charts
          items={(['signups', 'deepChatUsers'] as const).map((key, i) => ({
            title: ['소재별 웹 신규 가입자', '소재별 5턴 이상 채팅 사용자'][i],
            rows: dailyRows(d, (day) =>
              Object.fromEntries(
                contents.map((content, index) => [
                  `item${index}`,
                  day[key].find((row) => row.content === content)?.users ?? 0,
                ]),
              ),
            ),
            series,
            unit: '명',
          }))}
        />
        <NumericTable
          title="소재별 가입 합계"
          headers={['소재', '가입 합계']}
          rows={d.totals.signups.map((row) => [
            row.content ?? '소재 정보 없음',
            n(row.users, '명'),
          ])}
        />
      </>
    );
  }

  const d = data as T.AppTransferResponse;
  const sources = orderedKeys(
    d.totals.newUsersBySource.map((row) => row.source),
    d.daily.flatMap((day) => day.newUsersBySource.map((row) => row.source)),
  );

  return (
    <>
      <SummaryCards
        items={[
          {
            label: '배너 경유 앱 신규 사용자',
            value: n(d.totals.bannerNewUsers, '명'),
          },
        ]}
      />
      <Charts
        items={[
          {
            title: '앱 배너 사용자',
            rows: dailyRows(d, (day) => ({
              shown: day.bannerShown,
              clicked: day.bannerClicked,
            })),
            series: pairSeries([
              ['shown', '배너 노출 사용자'],
              ['clicked', '배너 클릭 사용자'],
            ]),
            unit: '명',
          },
          {
            title: '배너 클릭률',
            rows: dailyRows(d, (day) => ({ value: day.bannerClickRate })),
            series: single('value', '배너 클릭률'),
            unit: '%',
            emptyLabel: '노출 없음',
          },
          {
            title: '설치 경로별 앱 신규 사용자',
            rows: dailyRows(d, (day) =>
              Object.fromEntries(
                sources.map((source, index) => [
                  `item${index}`,
                  day.newUsersBySource.find((row) => row.source === source)
                    ?.users ?? 0,
                ]),
              ),
            ),
            series: dynamicSeries(sources, '설치 경로 정보 없음'),
            unit: '명',
            stacked: true,
          },
        ]}
      />
    </>
  );
}

/** 합계 순서를 유지하고 합계에 없는 값과 값 없음을 뒤에 놓는다. */
export function orderedKeys(
  totals: (string | null)[],
  daily: (string | null)[],
) {
  const ordered = [...new Set(totals.filter((value) => value !== null))];
  const extra = [
    ...new Set(
      daily.filter(
        (value): value is string => value !== null && !ordered.includes(value),
      ),
    ),
  ].sort();

  return [
    ...ordered,
    ...extra,
    ...([...totals, ...daily].includes(null) ? [null] : []),
  ];
}

function dynamicSeries(keys: (string | null)[], missing: string) {
  return pairSeries(keys.map((key, i) => [`item${i}`, key ?? missing])).map(
    (series, i) => ({
      ...series,
      color: keys[i] === null ? 'var(--muted-foreground)' : series.color,
    }),
  );
}

export function AppActivationContent({
  data: d,
}: {
  data: T.AppActivationResponse;
}) {
  return (
    <>
      <SummaryCards
        items={[
          { label: '앱 신규 사용자', value: n(d.totals.newUsers, '명') },
          {
            label: '앱 신규 활성 사용자',
            value: n(d.totals.activeUsers, '명'),
          },
          { label: '활성화 비율', value: percent(d.totals.activationRate) },
        ]}
      />
      <Charts
        items={[
          {
            title: '앱 신규 활성 사용자',
            rows: dailyRows(d, (day) => ({
              newUsers: day.newUsers,
              activeUsers: day.activeUsers,
            })),
            series: pairSeries([
              ['newUsers', '앱 신규 사용자'],
              ['activeUsers', '앱 신규 활성 사용자'],
            ]),
            unit: '명',
          },
          {
            title: '활성화 비율',
            rows: dailyRows(d, (day) => ({ value: day.activationRate })),
            series: single('value', '활성화 비율'),
            unit: '%',
          },
        ]}
      />
    </>
  );
}

export function ActivityVolume({ data: d }: { data: T.QualityResponse }) {
  const series = pairSeries([
    ['messages', '채팅 메시지 전송'],
    ['aiResponses', 'AI 응답 저장'],
    ['simpleCompletions', '간편 제작 완료'],
    ['generalSubmissions', '일반 제작 제출'],
  ]);
  const missing = d.daily.every((day) => day.activity === undefined);
  const rows = dailyRows(d, (day) => ({
    messages: Object.values(day.messagesByInputMode).reduce((a, b) => a + b, 0),
    ...day.activity,
  }));

  if (missing) return <p role="status">준비 중</p>;

  return (
    <>
      <SummaryCards
        items={series.map((s) => ({
          label: s.label,
          value: n(
            rows.reduce(
              (sum, row) => sum + (row.pending ? 0 : Number(row[s.key] ?? 0)),
              0,
            ),
            '회',
          ),
        }))}
      />
      <Charts
        items={[
          { title: '활동량', rows, series, unit: '회' },
          {
            title: '핵심 활동 사용자',
            rows: dailyRows(d, (day) => ({
              value: day.activity?.coreActiveUsers ?? null,
            })),
            series: single('value', '핵심 활동 사용자'),
            unit: '명',
          },
          {
            title: '핵심 활동 사용자 1인당 활동',
            rows: dailyRows(d, (day) => ({
              messages: day.activity?.messagesPerCoreUser ?? null,
              completions: day.activity?.simpleCompletionsPerCoreUser ?? null,
            })),
            series: pairSeries([
              ['messages', '채팅 메시지 전송'],
              ['completions', '간편 제작 완료'],
            ]),
            unit: '회',
          },
        ]}
      />
    </>
  );
}
