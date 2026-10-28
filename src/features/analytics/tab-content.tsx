'use client';

import type { ReactNode } from 'react';

import { DataTable, dateTime } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Card } from '@/components/ui/card';
import { aiFeatureLabel, aiFeatures } from '@/features/dashboard/chart-data';

import {
  basisText,
  eventLabel,
  metricNumber as n,
  modelLabel,
  percent,
  platformText,
  ratio,
} from './config';
import { allZero, MetricHelp } from './metric-definition';
import {
  basisMark,
  formatPlotValue,
  FunnelChart,
  NumericTable,
  PendingDates,
  PlatformPlaceholder,
  PlatformSource,
  type PlotEmptyLabel,
  type PlotRow,
  Ranking,
  SeriesChart,
  SummaryCards,
} from './metric-ui';
import { chartDates } from './range';
import { retentionHelp } from './retention';
import {
  featureSeries,
  listedSeries,
  modelSeries,
  pairSeries,
  type Series,
  seriesGroups,
} from './series';
import { PlatformReachChart, TurnReachChart } from './turn-reach-chart';
import type * as T from './types';

const single = (key: string, label: string) => pairSeries([[key, label]]);

export function dailyRows<D extends { date: string }>(
  data: { from: string; to: string; daily: D[]; pendingDates?: string[] },
  map: (day: D) => Record<string, number | null>,
  { preservePendingValues = false } = {},
): PlotRow[] {
  const byDate = new Map(data.daily.map((day) => [day.date, day]));

  return chartDates(data.from, data.to).map((date) => {
    const day = byDate.get(date);
    const pending = !day || data.pendingDates?.includes(date);

    return {
      date,
      ...(day && (!pending || preservePendingValues) ? map(day) : {}),
      ...(pending ? { pending: 1 } : {}),
    };
  });
}

export function Charts({
  items,
}: {
  items: {
    title: string;
    rows: PlotRow[];
    series: Series[];
    unit: string;
    emptyLabel?: PlotEmptyLabel;
    href?: (date: string) => string;
    aside?: ReactNode;
    /** 고른 구분을 적용하지 못한 값이면 제목 옆과 전체 수치 표에 보이는 표시 문구다. */
    basis?: string | null;
    /** 값이 없어 차트 대신 보이는 안내 문구다. 전체 수치 표에서도 뺀다. */
    empty?: string;
  }[];
}) {
  // 모든 차트가 같은 전체 기준이면 전체 수치 표의 값 열 머리글 옆에 한 번만 보인다.
  const shared = items.every((item) => item.basis === items[0]?.basis)
    ? items[0]?.basis
    : undefined;

  const definitions = items.map((item) => item.title);

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2">
        {items.map(({ basis, empty, ...item }) =>
          empty ? (
            <PlatformPlaceholder
              key={item.title}
              title={item.title}
              aside={item.aside}
              message={empty}
            />
          ) : (
            <SeriesChart
              key={item.title}
              {...item}
              aside={item.aside ?? basisMark(basis)}
            />
          ),
        )}
      </div>
      <NumericTable
        title="전체 수치 표"
        definitionTitle={definitions}
        headers={[
          { label: '지표', definitionTitle: definitions },
          { label: '날짜', definitionTitle: null },
          { label: '계열', definitionTitle: definitions },
          {
            label: shared ? `값 · ${shared}` : '값',
            definitionTitle: definitions,
          },
        ]}
        rows={items.flatMap((item) =>
          (item.empty ? [] : item.rows).flatMap((row) =>
            item.series.map((series) => [
              <span key="metric" className="inline-flex items-center gap-2">
                {item.title}
                {item.basis && !shared ? basisMark(item.basis) : null}
                <MetricHelp title={item.title} />
              </span>,
              row.date,
              series.label,
              formatPlotValue(row, series.key, item),
            ]),
          ),
        )}
      />
    </>
  );
}

const memberHref = (date: string) => `/members?from=${date}&to=${date}`;

export function UserContent({
  tab,
  data,
  platform,
}: {
  tab: string;
  data: unknown;
  platform: string;
}) {
  const key = platform as keyof T.PlatformCounts;
  const series =
    seriesGroups.platform.find((series) => series.key === key) ??
    seriesGroups.platform[0];
  // 고른 플랫폼으로 나눌 수 없는 값의 표시다. 전체면 표시하지 않는다.
  const basis = basisText(platform !== 'all', false);

  if (tab === 'activity') {
    const d = data as T.ActivityResponse;
    const last = d.daily.at(-1);

    return (
      <>
        <SummaryCards
          items={[
            {
              label: 'MAU',
              aside: basisMark(basis),
              value:
                d.monthlyActiveUsers === null ? (
                  <span role="status">준비 중</span>
                ) : (
                  n(d.monthlyActiveUsers, '명')
                ),
            },
            {
              label: '마지막 날 DAU',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.activeUsers[key]),
              )
                ? '이벤트 수신 없음'
                : last
                  ? n(last.activeUsers[key], '명')
                  : '준비 중',
              detail: last?.date,
            },
            {
              label: '누적 신규 방문자',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.newVisitors[key]),
              )
                ? '이벤트 수신 없음'
                : last
                  ? n(last.cumulativeNewVisitors[key], '명')
                  : '준비 중',
              detail: last?.date,
            },
          ]}
        />
        <Charts
          items={(
            [
              'activeUsers',
              'newVisitors',
              'cumulativeNewVisitors',
              'messagesPerUser',
            ] as const
          ).map((metric, i) => ({
            title: [
              '일별 활성 사용자 (DAU)',
              '신규 방문자',
              '누적 신규 방문자',
              '사용자당 채팅 메시지 전송 수',
            ][i],
            rows: dailyRows(d, (day) => ({ [series.key]: day[metric][key] })),
            series: [series],
            unit: metric === 'messagesPerUser' ? '회' : '명',
            // 서버가 사용자당 전송 수의 전체 값을 주지 않는다.
            empty:
              metric === 'messagesPerUser' && key === 'all'
                ? platformText.messagesPerUserEmpty
                : undefined,
          }))}
        />
      </>
    );
  }

  if (tab === 'retention') {
    const d = data as T.RetentionResponse;
    const selected = d.platforms.find((p) => p.platform === platform);

    if (!selected) return null;

    const byDate = new Map(selected.cohorts.map((row) => [row.date, row]));

    return (
      <>
        <SummaryCards
          items={(
            ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd30'] as const
          ).map((key) => ({
            label: `${key.toUpperCase()} 가중 평균`,
            value: percent(selected.summary[key], '관찰 전'),
          }))}
        />
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <h3 className="font-semibold">코호트 표</h3>
            <MetricHelp title="코호트 표">{retentionHelp(d.cohort)}</MetricHelp>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <DataTable
              headers={[
                '시작일',
                '시작 인원',
                'D1',
                'D2',
                'D3',
                'D4',
                'D5',
                'D6',
                'D7',
                'D30',
              ].map((label) => ({
                label,
                help:
                  label === '시작일' ? undefined : (
                    <MetricHelp
                      title={label === '시작 인원' ? '코호트 표' : label}
                    />
                  ),
              }))}>
              {chartDates(d.from, d.to).map((date) => {
                const row = byDate.get(date);

                return (
                  <tr key={date}>
                    <td>{date}</td>
                    <td>{row ? n(row.users, '명') : '준비 중'}</td>
                    {(
                      ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd30'] as const
                    ).map((key) => (
                      <td
                        key={key}
                        style={
                          row && row[key] !== null
                            ? {
                                backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round(row[key] * 45)}%, white)`,
                              }
                            : undefined
                        }>
                        {row ? percent(row[key], '관찰 전') : '준비 중'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </DataTable>
          </div>
          <NumericTable
            definitionTitle="코호트 표"
            headers={[
              '시작일',
              '시작 인원',
              'D1',
              'D2',
              'D3',
              'D4',
              'D5',
              'D6',
              'D7',
              'D30',
            ]}
            rows={selected.cohorts.map((row) => [
              row.date,
              n(row.users, '명'),
              percent(row.d1, '관찰 전'),
              percent(row.d2, '관찰 전'),
              percent(row.d3, '관찰 전'),
              percent(row.d4, '관찰 전'),
              percent(row.d5, '관찰 전'),
              percent(row.d6, '관찰 전'),
              percent(row.d7, '관찰 전'),
              percent(row.d30, '관찰 전'),
            ])}
          />
        </Card>
      </>
    );
  }

  if (tab === 'sessions') {
    const d = data as T.SessionResponse;

    return (
      <Charts
        items={[
          {
            title: '평균 세션 길이',
            rows: dailyRows(d, (day) => ({
              [series.key]: day.averageSessionSeconds[key],
            })),
            series: [series],
            unit: '초',
          },
        ]}
      />
    );
  }

  const d = data as T.SignupResponse;
  // 준비 중 날짜는 가입 이벤트 기준 값(Amplitude)에만 적용하고 서버 DB 값은 모든 날짜를 그린다.
  const db = { ...d, pendingDates: [] };
  const sum = (key: keyof T.SignupCounts) =>
    d.daily.reduce((s, row) => s + row.signups[key], 0);
  const hasPlatform = d.daily.some(
    (day) => day.signupsByPlatform !== undefined,
  );
  const ready = d.daily.flatMap((day) =>
    day.signupsByPlatform ? [day.signupsByPlatform] : [],
  );
  const platformSum = n(
    ready.reduce((s, row) => s + row[key], 0),
    '명',
  );
  const platformSource = (
    <PlatformSource title={platformText.signupCard} asOf={d.platformAsOf} />
  );
  const platformChart = {
    title: platformText.signupCard,
    aside: platformSource,
    rows: dailyRows(d, (day) =>
      day.signupsByPlatform
        ? { [series.key]: day.signupsByPlatform[key] }
        : { pending: 1 },
    ),
    series: [series],
    unit: '명',
  };

  return (
    <>
      <SummaryCards
        items={[
          {
            label: '신규 가입자',
            aside: basisMark(basis),
            value: n(sum('total'), '명'),
          },
          {
            label: '가입 경로',
            aside: basisMark(basis),
            value: n(sum('google') + sum('kakao'), '명'),
            detail: `구글 ${n(sum('google'), '명')}, 카카오 ${n(sum('kakao'), '명')}`,
          },
          {
            label: '게스트 이관 회원',
            aside: basisMark(basis),
            value: n(
              d.daily.reduce((s, row) => s + row.migratedFromGuest, 0),
              '명',
            ),
          },
          {
            label: platformText.signupCard,
            aside: platformSource,
            value: ready.length ? (
              allZero(
                d.daily
                  .filter((day) => !d.pendingDates?.includes(day.date))
                  .map((day) => day.signupsByPlatform?.[key]),
              ) ? (
                '이벤트 수신 없음'
              ) : (
                platformSum
              )
            ) : (
              <span role="status">준비 중</span>
            ),
          },
        ]}
      />
      <Charts
        items={[
          {
            title: '신규 가입자',
            rows: dailyRows(db, (day) => day.signups),
            series: seriesGroups.signup,
            unit: '명',
            href: memberHref,
            basis,
          },
          {
            title: '누적 가입자',
            rows: dailyRows(db, (day) => ({ value: day.cumulativeSignups })),
            series: single('value', '전체'),
            unit: '명',
            href: memberHref,
            basis,
          },
          {
            title: '게스트 이관 회원',
            rows: dailyRows(db, (day) => ({ value: day.migratedFromGuest })),
            series: single('value', '게스트 이관 회원'),
            unit: '명',
            href: memberHref,
            basis,
          },
        ]}
      />
      <div className="mt-5">
        <PendingDates dates={d.pendingDates ?? []} />
        {hasPlatform ? (
          <SeriesChart {...platformChart} />
        ) : (
          <PlatformPlaceholder
            title={platformText.signupCard}
            aside={platformSource}
          />
        )}
      </div>
    </>
  );
}
export function AcquisitionContent({
  tab,
  data,
  segment,
}: {
  tab: string;
  data: unknown;
  segment: string;
}) {
  if (tab === 'push') {
    const d = data as T.PushOpensResponse;
    const states: Record<string, string> = {
      BEFORE_MEASUREMENT: '측정 시작 전',
      NO_LINK: '링크 없음',
      PENDING: '발송 기록 없음',
    };
    const rateHelp = <MetricHelp title="열람률" />;
    const activities = (
      [
        'STORY_COMPLETED',
        'STORY_MODERATION_COMPLETED',
        'ATTENDANCE_REMINDER',
        'CREDIT_EXPIRY_REMINDER',
      ] as const
    )
      .map((type) => d.activityTypes.find((row) => row.type === type))
      .filter((row) => row !== undefined);

    return (
      <div className="space-y-5">
        {d.pendingDates.length ? (
          <p role="status" className="text-sm">
            열람 수는 준비된 날짜만 합산했습니다. 열람률은 일부 날짜의 열람 수를
            전체 도달 회원 수로 나눈 값입니다.
          </p>
        ) : null}
        <Card>
          <h3 className="mb-4 text-lg font-semibold">관리자 캠페인</h3>
          <DataTable
            headers={[
              '제목',
              '성격',
              {
                label: '마지막 발송 시작',
                help: (
                  <HelpTooltip label="마지막 발송 시작 도움말">
                    기간과 정렬은 마지막 발송 작업의 시작 시각 기준입니다.
                  </HelpTooltip>
                ),
              },
              { label: '도달 회원', help: <MetricHelp title="도달 회원" /> },
              { label: '푸시 열람', help: <MetricHelp title="푸시 열람" /> },
              { label: '열람률', help: rateHelp },
            ]}
            empty={!d.campaigns.length}
            emptyContent="선택한 기간에 해당하는 관리자 캠페인이 없습니다.">
            {d.campaigns.map((row) => (
              <tr key={row.campaignId}>
                <td>
                  {row.noticeId ? (
                    <span className="mr-2 inline-flex rounded-sm border bg-muted px-2 py-1 text-xs">
                      공지
                    </span>
                  ) : null}
                  {row.title}
                </td>
                <td>{row.kind === 'SERVICE' ? '정보성' : '광고성'}</td>
                <td>{dateTime(row.startedAt)} KST</td>
                <td>{n(row.deliveredMembers, '명')}</td>
                <td>
                  {row.openState === 'MEASURED'
                    ? row.pushOpens === null
                      ? '계산할 수 없음'
                      : n(row.pushOpens, '명')
                    : states[row.openState]}
                </td>
                <td>
                  {row.openState === 'MEASURED'
                    ? percent(row.pushOpenRate)
                    : states[row.openState]}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
        <Card>
          <h3 className="mb-4 text-lg font-semibold">활동 알림</h3>
          {d.activityFrom && d.activityFrom > d.from ? (
            <p className="mb-4 text-sm">
              {d.activityFrom}부터 집계했습니다. 그 전은 측정 시작 전입니다.
            </p>
          ) : null}
          <DataTable
            headers={[
              '종류',
              { label: '도달 회원', help: <MetricHelp title="도달 회원" /> },
              { label: '푸시 열람', help: <MetricHelp title="푸시 열람" /> },
              { label: '열람률', help: rateHelp },
            ]}
            empty={!activities.length}>
            {activities.map((row) => (
              <tr key={row.type}>
                <td>
                  {
                    {
                      STORY_COMPLETED: '스토리 완성',
                      STORY_MODERATION_COMPLETED: '검수 완료',
                      ATTENDANCE_REMINDER: '출석 리마인드',
                      CREDIT_EXPIRY_REMINDER: '이프 만료 예정',
                    }[row.type]
                  }
                </td>
                <td>{n(row.deliveredMembers, '명')}</td>
                <td>
                  {row.openState === 'MEASURED'
                    ? row.pushOpens === null
                      ? '계산할 수 없음'
                      : n(row.pushOpens, '명')
                    : states[row.openState]}
                </td>
                <td>
                  {row.openState === 'MEASURED'
                    ? percent(row.pushOpenRate)
                    : states[row.openState]}
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      </div>
    );
  }

  if (tab === 'trend') {
    const d = data as T.CampaignAnalyticsResponse;
    const t = d.totals;
    const segmentDetail = (x: T.CampaignSegments) =>
      `광고 유입 ${n(x.ads, '명')}, 광고 외 유입 ${n(x.nonAds, '명')}`;

    return (
      <>
        <SummaryCards
          items={[
            {
              label: '웹 DAU 평균',
              value: n(t.activeUsersAverage, '명', 1),
            },
            {
              label: '신규 방문자',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.newVisitors.all),
              )
                ? '이벤트 수신 없음'
                : n(t.newVisitors.all, '명'),
              detail: segmentDetail(t.newVisitors),
            },
            {
              label: '광고 유입 비중',
              value: percent(t.adsShare, '신규 방문자 없음'),
            },
            {
              label: '웹 신규 가입자',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.signups.all),
              )
                ? '이벤트 수신 없음'
                : n(t.signups.all, '명'),
              detail: segmentDetail(t.signups),
            },
            {
              label: '앱 신규 가입자',
              value:
                t.androidSignups === undefined ? (
                  <span role="status">준비 중</span>
                ) : allZero(
                    d.daily
                      .filter((day) => !d.pendingDates.includes(day.date))
                      .map((day) => day.androidSignups),
                  ) ? (
                  '이벤트 수신 없음'
                ) : (
                  n(t.androidSignups, '명')
                ),
            },
            {
              label: '스토리라인 생성 요청',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.storylineRequests),
              )
                ? '이벤트 수신 없음'
                : n(t.storylineRequests, '회'),
            },
            {
              label: '간편 제작 요청',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.completionRequests),
              )
                ? '이벤트 수신 없음'
                : n(t.completionRequests, '회'),
            },
            {
              label: '채팅 메시지 전송',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.chatMessages),
              )
                ? '이벤트 수신 없음'
                : n(t.chatMessages, '회'),
            },
          ]}
        />
        {d.pendingDates.length ? (
          <p className="mb-5 text-sm text-muted-foreground">
            준비된 날짜만 합산한 값입니다.
          </p>
        ) : null}
        <Charts
          items={[
            {
              title: '웹 DAU',
              rows: dailyRows(d, (day) => ({ value: day.activeUsers })),
              series: single('value', '웹 DAU'),
              unit: '명',
            },
            {
              title: '신규 방문자',
              rows: dailyRows(d, (day) => day.newVisitors),
              series: seriesGroups.ads,
              unit: '명',
            },
            {
              title: '유입 소스별 신규 방문자',
              rows: dailyRows(d, (day) => day.newVisitorsBySource),
              series: seriesGroups.source,
              unit: '명',
            },
            ...(['signups', 'cumulativeSignups'] as const).map((key, i) => ({
              title: ['웹 신규 가입자', '누적 웹 신규 가입자'][i],
              rows: dailyRows(d, (day) => day[key]),
              series: seriesGroups.ads,
              unit: '명',
            })),
            {
              title: '앱 신규 가입자',
              rows: dailyRows(d, (day) => ({
                value: day.androidSignups ?? null,
              })),
              series: single('value', '앱'),
              unit: '명',
            },
            {
              title: '제작 요청',
              rows: dailyRows(d, (day) => ({
                storylineRequests: day.storylineRequests,
                completionRequests: day.completionRequests,
              })),
              series: pairSeries([
                ['storylineRequests', '스토리라인 생성 요청'],
                ['completionRequests', '간편 제작 요청'],
              ]),
              unit: '회',
            },
            {
              title: '채팅 메시지 전송',
              rows: dailyRows(d, (day) => ({ value: day.chatMessages })),
              series: single('value', '채팅 메시지 전송'),
              unit: '회',
            },
          ]}
        />
      </>
    );
  }

  if (tab === 'creation') {
    const d = data as T.CampaignCreationResponse;
    const key = segment as keyof T.CampaignSegments;

    return (
      <FunnelChart
        definitionTitle="간편 제작 퍼널"
        steps={d.steps.map((step) => ({ ...step, users: step.users[key] }))}
        extraTable={
          <NumericTable
            definitionTitle="간편 제작 퍼널"
            headers={[
              '단계',
              '전체',
              '전체 전환율',
              '광고 유입',
              '광고 유입 전환율',
              '광고 외 유입',
              '광고 외 유입 전환율',
            ]}
            rows={d.steps.map((step, i) => [
              eventLabel(step.event),
              ...(['all', 'ads', 'nonAds'] as const).flatMap((k) => [
                n(step.users[k], '명'),
                percent(
                  i ? ratio(step.users[k], d.steps[i - 1].users[k]) : null,
                ),
              ]),
            ])}
          />
        }
      />
    );
  }

  if (tab === 'story-detail')
    return (
      <FunnelChart
        steps={(data as T.CampaignStoryResponse).steps}
        definitionTitle="상세 진입 퍼널"
      />
    );

  const d = data as T.CampaignSourceResponse;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Ranking
        title="첫 유입 소스별 신규 방문자"
        items={d.sources.map((row) => ({
          label: row.source ?? '소스 정보 없음',
          value: row.newVisitors,
        }))}
      />
      <Ranking
        title="커뮤니티와 SNS 게시글별 방문자"
        items={d.posts.map((row) => ({
          label: row.content ?? '게시글 정보 없음',
          value: row.visitors,
        }))}
      />
    </div>
  );
}
export function ConversionContent({
  data,
  platform = 'all',
  segment = 'all',
}: {
  data: unknown;
  platform?: string;
  segment?: string;
}) {
  const d = data as T.TurnReachResponse;
  const g = d.guestToMember;
  // 서버 DB 값은 플랫폼으로 나눌 수 없어 플랫폼 전체 기준으로 표시한다.
  const basis = basisText(platform !== 'all', false);

  return (
    <>
      <TurnReachChart data={d} segment={segment} basis={basis} />
      {/* 게스트에서 회원으로는 대상으로 나눌 수 없는 묶음이라 대상이 전체일 때만 보인다. */}
      {segment === 'all' ? (
        <SummaryCards
          items={[
            {
              label: '게스트에서 회원으로',
              aside: basisMark(basis),
              value: g.chatsReached5 ? percent(g.rate) : '대상 채팅 없음',
              detail: `5턴 이상 ${n(g.chatsReached5, '개')}, 6턴 이상 ${n(g.chatsReached6, '개')}`,
            },
          ]}
        />
      ) : null}
      <div className="mt-5">
        <PendingDates dates={d.pendingDates ?? []} />
        <PlatformReachChart
          platforms={d.platforms}
          platform={platform}
          aside={
            <PlatformSource
              title={platformText.reachTitle}
              asOf={d.platformAsOf}
            />
          }
        />
      </div>
    </>
  );
}
export function QualityContent({
  tab,
  data,
  platform = 'all',
  segment = 'all',
}: {
  tab: string;
  data: unknown;
  platform?: string;
  segment?: string;
}) {
  if (tab === 'client') {
    const d = data as T.QualityResponse;
    const errors = listedSeries([
      ['chatLoadError', '채팅 불러오기 오류'],
      ['storyListLoadError', '스토리 목록 불러오기 오류'],
    ]);
    const signals = listedSeries([
      ['creditShortage', '이프 부족 안내'],
      ['creditChargeViewed', '충전 화면 조회'],
      ['attendanceClicked', '충전 화면 출석 버튼 클릭'],
      ['inviteSucceeded', '초대 코드 입력 성공'],
    ]);

    return (
      <>
        <SummaryCards
          items={[
            {
              label: '채팅 메시지 전송',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) =>
                    Object.values(day.messagesByInputMode).reduce(
                      (a, b) => a + b,
                      0,
                    ),
                  ),
              )
                ? '이벤트 수신 없음'
                : n(
                    d.daily
                      .filter((day) => !d.pendingDates.includes(day.date))
                      .reduce(
                        (s, row) =>
                          s +
                          Object.values(row.messagesByInputMode).reduce(
                            (a, b) => a + b,
                            0,
                          ),
                        0,
                      ),
                    '회',
                  ),
            },
            {
              label: '스트림 오류 표시',
              value: allZero(
                d.daily
                  .filter((day) => !d.pendingDates.includes(day.date))
                  .map((day) => day.streamErrors),
              )
                ? '이벤트 수신 없음'
                : n(
                    d.daily
                      .filter((day) => !d.pendingDates.includes(day.date))
                      .reduce((s, row) => s + row.streamErrors, 0),
                    '회',
                  ),
            },
          ]}
        />
        <Charts
          items={[
            {
              title: '입력 방식별 채팅 메시지 전송',
              rows: dailyRows(d, (day) => day.messagesByInputMode),
              series: seriesGroups.input,
              unit: '회',
            },
            {
              title: '스트림 오류율',
              rows: dailyRows(d, (day) => ({ value: day.streamErrorRate })),
              series: single('value', '스트림 오류율'),
              unit: '%',
              emptyLabel: '전송 없음',
            },
            {
              title: '오류 표시 사용자',
              rows: dailyRows(d, (day) => day.users),
              series: errors,
              unit: '명',
            },
            {
              title: '이프와 초대 신호 사용자',
              rows: dailyRows(d, (day) => day.users),
              series: signals,
              unit: '명',
            },
            {
              title: '간편 제작 실패율',
              rows: dailyRows(
                { ...d, daily: d.storyCompletion ?? [], pendingDates: [] },
                (day) => ({ value: day.failureRate }),
              ),
              series: single('value', '간편 제작 실패율'),
              unit: '%',
              emptyLabel: '요청 없음',
              aside: (
                <>
                  <span className="text-xs text-muted-foreground">서버 DB</span>
                  {basisMark(basisText(platform !== 'all', segment !== 'all'))}
                </>
              ),
              empty: d.storyCompletion === undefined ? '준비 중' : undefined,
            },
          ]}
        />
      </>
    );
  }

  if (tab === 'chat-options') {
    const d = data as T.ChatOptionResponse;
    const db = { ...d, pendingDates: [] };
    const chats = d.daily.reduce((s, row) => s + row.chats, 0),
      persona = d.daily.reduce((s, row) => s + row.withPersona, 0);
    const codes = [
      ...new Set(
        d.daily.flatMap((row) => [
          ...Object.keys(row.byModel),
          ...Object.keys(row.turnsByModel),
        ]),
      ),
    ];
    const models = modelSeries(codes);
    const turns = d.daily.reduce(
      (sum, row) =>
        sum + Object.values(row.turnsByModel).reduce((a, b) => a + b, 0),
      0,
    );
    // 서버 DB 값은 플랫폼으로도 대상으로도 나눌 수 없다.
    const basis = basisText(platform !== 'all', segment !== 'all');
    const aside = basisMark(basis);

    return (
      <>
        <SummaryCards
          items={[
            { label: '채팅 수', aside, value: n(chats, '개') },
            {
              label: '페르소나 사용 채팅 수',
              aside,
              value: n(persona, '개'),
              detail: percent(ratio(persona, chats), '채팅 없음'),
            },
            { label: '턴 수', aside, value: n(turns, '턴') },
          ]}
        />
        <div className="mb-3 flex justify-end">
          <HelpTooltip label="채팅 옵션 모델 집계 기준">
            <ul className="list-disc space-y-1 pl-4">
              <li>
                채팅 수는 채팅에 지금 선택된 모델 기준이고 턴 수는 그 턴을
                실제로 만든 모델 기준입니다.
              </li>
              <li>게스트 턴은 라이트로 셉니다.</li>
            </ul>
          </HelpTooltip>
        </div>
        <Charts
          items={[
            {
              title: '채팅 수',
              rows: dailyRows(db, (day) => ({
                chats: day.chats,
                withPersona: day.withPersona,
              })),
              series: pairSeries([
                ['chats', '채팅 수'],
                ['withPersona', '페르소나 사용 채팅 수'],
              ]),
              unit: '개',
              basis,
            },
            {
              title: '모델별 채팅 수',
              rows: dailyRows(db, (day) =>
                Object.fromEntries(
                  models.map(({ key }) => [key, day.byModel[key] ?? 0]),
                ),
              ),
              series: models.filter(({ key }) =>
                d.daily.some((day) => key in day.byModel),
              ),
              unit: '개',
              basis,
            },
            {
              title: '모델별 턴 수',
              rows: dailyRows(db, (day) =>
                Object.fromEntries(
                  models.map(({ key }) => [key, day.turnsByModel[key] ?? 0]),
                ),
              ),
              series: models.filter(({ key }) =>
                d.daily.some((day) => key in day.turnsByModel),
              ),
              unit: '턴',
              basis,
            },
          ]}
        />
        <NumericTable
          title="모델별 비중"
          basis={basis}
          headers={[
            '모델',
            { label: '채팅 수', definitionTitle: '모델별 채팅 수' },
            { label: '채팅 비중', definitionTitle: '모델별 채팅 수' },
            { label: '턴 수', definitionTitle: '모델별 턴 수' },
            { label: '턴 비중', definitionTitle: '모델별 턴 수' },
          ]}
          rows={models.map(({ key: model }) => {
            const count = d.daily.reduce(
              (s, row) => s + (row.byModel[model] ?? 0),
              0,
            );

            const modelTurns = d.daily.reduce(
              (sum, row) => sum + (row.turnsByModel[model] ?? 0),
              0,
            );

            return [
              modelLabel(model),
              n(count, '개'),
              percent(ratio(count, chats), '채팅 없음'),
              n(modelTurns, '턴'),
              percent(ratio(modelTurns, turns), '턴 없음'),
            ];
          })}
        />
        <ChatOptionPlatforms data={d} platform={platform} />
      </>
    );
  }

  const d = data as T.AiCostResponse;
  const items = d.daily.flatMap((day) =>
    day.byFeature.map((item) => ({ date: day.date, ...item })),
  );
  const missingTokens = items
    .filter((item) => item.feature !== 'chat_image')
    .reduce((s, row) => s + row.callsWithoutTokens, 0);
  const costEmptyLabel = (date: string) =>
    d.pendingDates.includes(date)
      ? '준비 중'
      : d.expiredDates.includes(date)
        ? '보관 기간 지남'
        : '비용 기록 없음';

  return (
    <>
      <SummaryCards
        items={[
          { label: '총 AI 비용', value: n(d.totals.costKrw, '원') },
          {
            label: '턴당 원가',
            value:
              d.totals.costPerTurnKrw === null
                ? items.some(
                    (item) =>
                      item.feature === 'chat_response' && item.calls > 0,
                  )
                  ? '계산할 수 없음'
                  : '호출 없음'
                : n(d.totals.costPerTurnKrw, '원'),
          },
          {
            label: '스토리당 원가',
            value:
              d.totals.costPerStoryKrw === null
                ? items.some(
                    (item) =>
                      item.feature === 'story_completion' && item.calls > 0,
                  )
                  ? '계산할 수 없음'
                  : '호출 없음'
                : n(d.totals.costPerStoryKrw, '원'),
          },
        ]}
      />
      {d.expiredDates.length ? (
        <p className="mb-3 text-sm">
          Langfuse 보관 기간({d.retentionDays}일)이 지나 비용 기록이 없는 날짜가{' '}
          {d.expiredDates.length}일 있습니다. 해당 날짜는 턴당 원가와 스토리당
          원가 계산에서 제외했습니다. 실시간 이미지 비용은 해당 날짜도 총 AI
          비용에 포함합니다.
        </p>
      ) : null}
      {d.unpricedModels.length ? (
        <p className="mb-3 text-sm">
          사용량은 있으나 비용이 0원인 모델: {d.unpricedModels.join(', ')}.
          Langfuse 모델 단가 설정을 확인해 주세요.
        </p>
      ) : null}
      {d.unmapped.length ? (
        <p className="mb-3 text-sm">
          기능에 연결되지 않은 Langfuse 추적:{' '}
          {d.unmapped
            .map((item) => `${item.traceName} ${n(item.costKrw, '원')}`)
            .join(', ')}
          . 이 비용은 총 AI 비용에만 들어갑니다.
        </p>
      ) : null}
      {missingTokens ? (
        <p className="mb-5 text-sm">
          토큰 수가 기록되지 않은 호출 {missingTokens}회가 있어 토큰 합이
          실제보다 작을 수 있습니다.
        </p>
      ) : null}
      <Charts
        items={[
          {
            title: '기능별 일별 비용',
            emptyLabel: costEmptyLabel,
            rows: dailyRows(
              d,
              (day) =>
                Object.fromEntries(
                  aiFeatures.map((feature) => {
                    const costs = day.byFeature.filter(
                      (item) =>
                        item.feature === feature && item.costKrw !== null,
                    );

                    return [
                      feature,
                      costs.length
                        ? costs.reduce((sum, item) => sum + item.costKrw!, 0)
                        : null,
                    ];
                  }),
                ),
              { preservePendingValues: true },
            ),
            series: featureSeries(
              aiFeatures.map((feature) => [feature, aiFeatureLabel(feature)]),
            ),
            unit: '원',
          },
        ]}
      />
      <NumericTable
        title="비용 표"
        headers={[
          '날짜',
          '기능',
          '모델',
          '호출 수',
          '입력 토큰',
          '출력 토큰',
          '비용',
          '토큰 수가 없는 호출 수',
        ]}
        rows={items.map((row) => [
          row.date,
          aiFeatureLabel(row.feature),
          row.model ?? '모델 정보 없음',
          n(row.calls, '회'),
          row.feature === 'chat_image'
            ? '해당 없음'
            : row.inputTokens.toLocaleString('ko-KR'),
          row.feature === 'chat_image'
            ? '해당 없음'
            : row.outputTokens.toLocaleString('ko-KR'),
          row.costKrw === null
            ? costEmptyLabel(row.date)
            : n(row.costKrw, '원'),
          row.feature === 'chat_image'
            ? '해당 없음'
            : n(row.callsWithoutTokens, '회'),
        ])}
      />
    </>
  );
}

/** 채팅 옵션 비중의 Amplitude 카드와 표다. 고른 플랫폼 값을 준비된 날짜만 더한다. */
function ChatOptionPlatforms({
  data: d,
  platform,
}: {
  data: T.ChatOptionResponse;
  platform: string;
}) {
  const key = platform as keyof T.PlatformCounts;
  const ready = d.daily.filter(
    (day) =>
      day.chatStarts && day.personaChatStarts && day.platformTurnsByModel,
  );
  const total = (pick: (day: T.ChatOptionDay) => T.PlatformCounts) =>
    ready.reduce((s, day) => s + pick(day)[key], 0);
  const models = modelSeries(
    ready.flatMap((day) => Object.keys(day.platformTurnsByModel!)),
  );
  const pending = <span role="status">준비 중</span>;

  return (
    <div className="mt-5">
      <PendingDates dates={d.pendingDates ?? []} />
      <SummaryCards
        items={[
          {
            label: platformText.personaTitle,
            aside: (
              <PlatformSource
                title={platformText.personaTitle}
                asOf={d.platformAsOf}
              />
            ),
            value: ready.length
              ? percent(
                  ratio(
                    total((day) => day.personaChatStarts!),
                    total((day) => day.chatStarts!),
                  ),
                  platformText.personaEmpty,
                )
              : pending,
          },
        ]}
      />
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <h3 className="font-semibold">{platformText.modelTurnsTitle}</h3>
          <MetricHelp title={platformText.modelTurnsTitle} />
          <PlatformSource
            title={platformText.modelTurnsTitle}
            asOf={d.platformAsOf}
          />
        </div>
        {ready.length ? (
          <DataTable
            headers={[
              '모델',
              {
                label: '턴 수',
                help: <MetricHelp title={platformText.modelTurnsTitle} />,
              },
            ]}
            empty={!models.length}>
            {models.map(({ key: model }) => (
              <tr key={model}>
                <td>{modelLabel(model)}</td>
                <td>
                  {n(
                    ready.reduce(
                      (s, day) =>
                        s + (day.platformTurnsByModel![model]?.[key] ?? 0),
                      0,
                    ),
                    '턴',
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="text-sm">{pending}</p>
        )}
      </Card>
    </div>
  );
}
