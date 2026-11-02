'use client';

import type { ReactNode } from 'react';

import { dateTime, QueryState, TextLink } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import {
  ChartsSkeleton,
  LoadingStatus,
  SummarySkeleton,
  TableSkeleton,
} from '@/components/admin/loading-ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardCharts } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

import { Charts, dailyRows } from './charts';
import { metricNumber, percent, sourceHelp } from './config';
import { MetricScope } from './metric-definition';
import {
  basisMark,
  NumericTable,
  Ranking,
  Source,
  SummaryCards,
} from './metric-ui';
import type {
  ChatEngagement,
  CreditMetrics,
  ModerationMetrics,
  PaymentMetrics,
  StoryConsumption,
} from './new-metrics-types';
import { PendingDates } from './pending-dates';
import { analyticsRefetch } from './range';
import type { AiCostResponse } from './types';

const n = (value: number, unit: string) => metricNumber(value, unit);
const current = (
  <span className="rounded-sm border px-1.5 text-xs font-normal text-muted-foreground">
    현재
  </span>
);
const dbHelp =
  '서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 완료된 주문은 뒤에 환불돼도 셉니다. 유효 잔액은 만료되지 않은 이프만 더한 현재 값입니다.';
const contentHelp =
  '서버 DB 출처 지표입니다. 소비와 창작자는 팀 계정을 제외하고 검수는 제외하지 않습니다.';
const consumptionHelp =
  '다른 회원이 만든 스토리를 플레이한 회원 채팅만 셉니다. 게스트 채팅은 누가 만든 스토리인지 판정할 수 없어 세지 않습니다. 스토리 수와 순위는 현재 상태 기준입니다.';
const moderationHelp =
  '재제출하면 같은 제출본이 다시 대기로 바뀌어 이전 판정은 남지 않습니다. 값은 지금 남아 있는 판정 기준입니다. 팀 계정을 제외하지 않습니다.';
const single = (key: string, label: string) => [
  { key, label, color: 'var(--chart-1)' },
];

function MetricArea({
  title,
  asOf,
  scope,
  source = '서버 DB',
  help = dbHelp,
  detail,
  children,
}: {
  title: string;
  asOf?: string | null;
  scope: string;
  source?: string;
  help?: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <MetricScope value={scope}>
      <section className="mb-8" aria-label={`${title} 영역`}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Source source={source} help={help} />
          {detail ? (
            <HelpTooltip label={`${title} 도움말`}>{detail}</HelpTooltip>
          ) : null}
        </div>
        {asOf ? (
          <p className="mb-4 text-xs text-muted-foreground">
            {dateTime(asOf)} KST 집계 기준
          </p>
        ) : null}
        {children}
      </section>
    </MetricScope>
  );
}

function DataAreas<T>({
  url,
  title,
  scope,
  cards = 4,
  charts = 2,
  skeleton,
  children,
}: {
  url: string;
  title: string;
  scope: string;
  cards?: number;
  charts?: number;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const query = useApi<T>(url);

  return query.data && !query.isError ? (
    children(query.data)
  ) : (
    <MetricArea
      title={title}
      scope={scope}
      help={
        scope === 'consumption' || scope === 'moderation'
          ? contentHelp
          : scope === 'depth'
            ? '서버 DB 출처 지표입니다. 팀 계정은 제외합니다.'
            : dbHelp
      }>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
        skeleton={
          skeleton ?? (
            <>
              <SummarySkeleton count={cards} />
              {charts ? <ChartsSkeleton count={charts} /> : null}
            </>
          )
        }
      />
    </MetricArea>
  );
}

export function PaymentMetricsArea({ query }: { query: string }) {
  return (
    <DataAreas<PaymentMetrics>
      url={`/api/payments/metrics?${query}`}
      title="결제 지표"
      scope="payment-metrics">
      {(d) => (
        <MetricArea title="결제 지표" scope="payment-metrics" asOf={d.asOf}>
          <SummaryCards
            items={[
              {
                label: '결제 전환율',
                value: percent(d.conversionRate, '활성 회원 없음'),
                detail: `결제 ${n(d.payingMembers, '명')} / 활성 ${n(d.activeMembers, '명')}`,
              },
              {
                label: '결제 회원 1인당 금액',
                value:
                  d.arppu === null
                    ? '결제 없음'
                    : `${Math.round(d.arppu).toLocaleString('ko-KR')}원`,
              },
              {
                label: '첫 결제',
                value: n(d.firstTime.orders, '건'),
                detail: `재결제 ${n(d.repeat.orders, '건')} ${n(d.repeat.amountKrw, '원')}`,
              },
              {
                label: '환불률',
                value: percent(d.refundRate, '완료 주문 없음'),
                detail: `환불 ${n(d.refundedOrders, '건')}`,
              },
            ]}
          />
          <div className="mb-5 grid gap-5 xl:grid-cols-2">
            <Ranking
              title="상품별 매출"
              table={false}
              unit="원"
              preserveOrder
              items={d.products.map((row) => ({
                label: row.productId,
                value: row.amountKrw,
                display: `${n(row.amountKrw, '원')} (${n(row.orders, '건')})`,
              }))}
            />
            <div>
              <Charts
                items={[
                  {
                    title: '첫 결제까지 걸린 일수',
                    categoryLabel: '구간',
                    stacked: true,
                    unit: '명',
                    series: single('members', '회원'),
                    rows: d.daysToFirstPayment.map((row) => ({
                      date:
                        (
                          {
                            '0': '당일',
                            '1~3': '1~3일',
                            '4~7': '4~7일',
                            '8~30': '8~30일',
                            '31+': '31일 이상',
                          } as Record<string, string>
                        )[row.bucket] ?? row.bucket,
                      members: row.members,
                    })),
                  },
                ]}
              />
            </div>
          </div>
          <NumericTable
            title="상품별 수치 표"
            definitionTitle="상품별 매출"
            headers={['상품', '주문', '금액', '지급 이프']}
            rows={d.products.map((row) => [
              row.productId,
              n(row.orders, '건'),
              n(row.amountKrw, '원'),
              n(row.creditAmount, '이프'),
            ])}
          />
        </MetricArea>
      )}
    </DataAreas>
  );
}

export function MarginArea({ query }: { query: string }) {
  const chart = useApi<DashboardCharts>(`/api/dashboard/charts?${query}`);
  const cost = useApi<AiCostResponse>(`/api/quality/ai-cost?${query}`, true, {
    refetchInterval: analyticsRefetch,
  });
  const c = cost.isError ? undefined : cost.data;
  const revenue = chart.isError ? undefined : chart.data?.totals?.revenue;
  const waiting = (c?.pendingDates.length ?? 0) > 0;
  const costValue = c?.totals.costKrw;
  const margin =
    revenue === undefined || costValue === undefined
      ? undefined
      : revenue - costValue;
  const status = cost.isError || chart.isError ? '불러오기 실패' : '준비 중';
  const loadingNumber = (
    <LoadingStatus>
      <Skeleton className="h-8 w-28" />
    </LoadingStatus>
  );
  const help = c
    ? sourceHelp['ai-cost']
        .replace(
          'Langfuse 출처 지표이며 {받은 시각} KST에 받은 값입니다.',
          c.asOf
            ? `Langfuse 출처 지표이며 ${dateTime(c.asOf)} KST에 받은 값입니다.`
            : 'Langfuse 출처 지표입니다.',
        )
        .replace('{환율}', String(c.usdKrwRate))
        .replace('{장당 원가}', String(c.chatImageUnitCostKrw))
    : '서버 DB와 Langfuse 출처 지표입니다.';

  return (
    <MetricArea
      title="마진"
      scope="margin"
      source="서버 DB와 Langfuse"
      help={help}>
      <QueryState
        variant="inline"
        pending={false}
        error={cost.error}
        retry={cost.refetch}
        source="langfuse"
      />
      {c ? <PendingDates dates={c.pendingDates} /> : null}
      <SummaryCards
        items={[
          {
            label: '결제 금액',
            aside: (
              <Source
                source="서버 DB"
                help="서버 DB 출처 지표입니다. 팀 계정은 제외합니다. 선택 기간에 완료된 주문의 가격 합이며 환불된 주문도 셉니다."
              />
            ),
            value: chart.isPending
              ? loadingNumber
              : revenue === undefined
                ? chart.isError
                  ? '불러오기 실패'
                  : '준비 중'
                : n(revenue, '원'),
          },
          {
            label: 'AI 비용',
            aside: (
              <Source
                source="Langfuse"
                help={c ? help : 'Langfuse 출처 지표입니다.'}
              />
            ),
            value: cost.isPending
              ? loadingNumber
              : waiting || costValue === undefined
                ? status
                : n(costValue, '원'),
          },
          {
            label: '마진',
            value:
              cost.isPending || chart.isPending
                ? loadingNumber
                : waiting || margin === undefined
                  ? status
                  : n(margin, '원'),
          },
          {
            label: '마진율',
            value:
              cost.isPending || chart.isPending
                ? loadingNumber
                : waiting || margin === undefined || revenue === undefined
                  ? status
                  : revenue === 0
                    ? '결제 없음'
                    : percent(margin / revenue),
          },
        ]}
      />
      {waiting ? (
        <p className="text-sm">AI 비용은 준비된 날짜만 더했습니다.</p>
      ) : null}
      {c?.expiredDates.length ? (
        <p className="text-sm text-muted-foreground">
          Langfuse 보관 기간({c.retentionDays}일)이 지나 비용 기록이 없는 날짜가{' '}
          {c.expiredDates.length}일 있습니다.
        </p>
      ) : null}
    </MetricArea>
  );
}

export function CreditMetricsArea({
  query,
  basis,
}: {
  query: string;
  basis: string | null;
}) {
  const aside = <>{basisMark(basis)}</>;
  const now = (
    <>
      {current}
      {basisMark(basis)}
    </>
  );
  const reasons: Record<string, string> = {
    SIGNUP_REWARD: '가입',
    INVITE_REWARD: '초대',
    ATTENDANCE_REWARD: '출석',
    PURCHASE: '구매',
    ADMIN_GRANT: '관리자 지급',
    STORY_CREATION: '간편 제작',
    CHAT_TURN: '채팅 턴',
    CHAT_IMAGE: '채팅 이미지',
  };

  return (
    <DataAreas<CreditMetrics>
      url={`/api/credits/metrics?${query}`}
      title="이프 경제"
      scope="credit-metrics"
      charts={4}>
      {(d) => (
        <MetricArea title="이프 경제" scope="credit-metrics" asOf={d.asOf}>
          <SummaryCards
            items={[
              { label: '적립', value: n(d.granted, '이프'), aside },
              { label: '소모', value: n(d.spent, '이프'), aside },
              {
                label: '소모 비율',
                value: percent(d.sinkRate, '적립 없음'),
                aside,
              },
              {
                label: '유효 잔액',
                value: n(d.balances.total, '이프'),
                detail: `회원 ${n(d.balances.members, '명')}`,
                aside: now,
              },
            ]}
          />
          <div className="mb-5 grid gap-5 xl:grid-cols-2">
            {(
              [
                ['사유별 적립', d.grantedByReason],
                ['사유별 소모', d.spentByReason],
              ] as const
            ).map(([title, rows]) => (
              <Ranking
                key={title}
                title={title}
                unit="이프"
                preserveOrder
                aside={aside}
                items={rows.map((row) => ({
                  label: reasons[row.reason] ?? row.reason,
                  value: row.amount,
                }))}
              />
            ))}
          </div>
          <Charts
            items={[
              {
                title: '잔액 분포',
                categoryLabel: '구간',
                unit: '명',
                stacked: true,
                series: single('members', '회원'),
                aside: now,
                basis,
                rows: d.balances.buckets.map((row) => ({
                  date:
                    (
                      {
                        '500~1999': '500~1,999',
                        '2000+': '2,000 이상',
                      } as Record<string, string>
                    )[row.bucket] ?? row.bucket,
                  members: row.members,
                })),
              },
              {
                title: '잔액 구성',
                categoryLabel: '구분',
                unit: '이프',
                horizontal: true,
                stacked: true,
                aside: now,
                basis,
                series: [
                  { key: 'purchased', label: '구매', color: 'var(--chart-1)' },
                  { key: 'rewarded', label: '보상', color: 'var(--chart-2)' },
                  { key: 'legacy', label: '승계', color: 'var(--chart-3)' },
                ],
                rows: [
                  {
                    date: '잔액',
                    purchased: d.balances.purchased,
                    rewarded: d.balances.rewarded,
                    legacy: d.balances.legacy,
                  },
                ],
              },
            ]}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            30일 안 만료 {n(d.balances.expiringIn30Days, '이프')}
          </p>
        </MetricArea>
      )}
    </DataAreas>
  );
}

export function ConsumptionTab({ query }: { query: string }) {
  return (
    <DataAreas<StoryConsumption>
      url={`/api/stories/consumption?${query}&limit=20`}
      title="소비"
      scope="consumption"
      charts={0}
      skeleton={
        <>
          <SummarySkeleton count={4} />
          <TableSkeleton columns={5} pagination={false} />
          <div className="mt-8">
            <SummarySkeleton count={3} />
          </div>
        </>
      }>
      {(d) => (
        <>
          <MetricArea
            title="소비"
            scope="consumption"
            asOf={d.asOf}
            help={contentHelp}
            detail={consumptionHelp}>
            <SummaryCards
              items={[
                {
                  label: '공개 스토리',
                  value: n(d.publicStories, '편'),
                  detail: `오리지널 ${n(d.officialStories, '편')}`,
                },
                { label: '플레이된 스토리', value: n(d.playedStories, '편') },
                {
                  label: '플레이된 스토리 비율',
                  value: percent(d.playedRate, '공개 스토리 없음'),
                },
                {
                  label: '상위 10편 집중도',
                  value: percent(d.topConcentration, '채팅 없음'),
                },
              ]}
            />
            <NumericTable
              title="플레이 순위"
              collapsible={false}
              headers={['순위', '스토리', '채팅', '플레이 회원', '턴']}
              rows={d.ranking.map((row, i) => [
                i + 1,
                <span
                  key={row.storyId}
                  className="inline-flex items-center gap-2">
                  <TextLink href={`/stories/${row.storyId}`}>
                    {row.title}
                  </TextLink>
                  {row.official ? (
                    <span className="rounded-sm border px-1.5 text-xs">
                      오리지널
                    </span>
                  ) : null}
                  {row.deleted ? (
                    <span className="rounded-sm border px-1.5 text-xs">
                      삭제됨
                    </span>
                  ) : null}
                </span>,
                n(row.chats, '개'),
                n(row.players, '명'),
                n(row.turns, '턴'),
              ])}
            />
          </MetricArea>
          <MetricArea
            title="창작자"
            scope="consumption"
            asOf={d.asOf}
            help={contentHelp}>
            <SummaryCards
              items={[
                {
                  label: '창작자',
                  value: n(d.creators.members, '명'),
                  detail: `활성 회원 ${n(d.creators.activeMembers, '명')}`,
                },
                {
                  label: '창작자 비율',
                  value: percent(d.creators.rate, '활성 회원 없음'),
                },
                {
                  label: '창작자 유지율',
                  value: percent(
                    d.creators.retentionRate,
                    '직전 기간 창작자 없음',
                  ),
                  detail: `직전 기간 창작자 ${n(d.creators.previousMembers, '명')} 중 ${n(d.creators.retained, '명')}`,
                },
              ]}
            />
          </MetricArea>
        </>
      )}
    </DataAreas>
  );
}

export function ModerationTab({ query }: { query: string }) {
  return (
    <DataAreas<ModerationMetrics>
      url={`/api/moderation/metrics?${query}`}
      title="검수 판정"
      scope="moderation"
      cards={5}
      skeleton={
        <>
          <SummarySkeleton count={5} />
          <ChartsSkeleton count={2} />
          <div className="mt-8">
            <TableSkeleton columns={3} pagination={false} />
          </div>
        </>
      }>
      {(d) => (
        <>
          <MetricArea
            title="검수 판정"
            scope="moderation"
            asOf={d.asOf}
            help={contentHelp}
            detail={moderationHelp}>
            <SummaryCards
              items={[
                { label: '판정', value: n(d.decided, '건') },
                {
                  label: '거절률',
                  value: percent(d.rejectionRate, '판정 없음'),
                },
                { label: '실행 실패', value: n(d.failed, '건') },
                {
                  label: '보류',
                  value: n(d.held, '건'),
                  href: '/moderation/submissions?status=HELD',
                  aside: current,
                },
                { label: '대기', value: n(d.pending, '건'), aside: current },
              ]}
            />
            <Charts
              items={[
                {
                  title: '일별 판정',
                  definitionTitle: ['일별 판정', '실행 실패'],
                  unit: '건',
                  stacked: true,
                  rows: dailyRows(d, (day) => ({
                    approved: day.approved,
                    rejected: day.rejected,
                    failed: day.failed,
                  })),
                  series: [
                    { key: 'approved', label: '승인', color: 'var(--chart-1)' },
                    { key: 'rejected', label: '거절', color: 'var(--chart-2)' },
                    {
                      key: 'failed',
                      label: '실행 실패',
                      color: 'var(--chart-3)',
                    },
                  ],
                },
                {
                  title: '처음 제출',
                  unit: '건',
                  rows: dailyRows(d, (day) => ({ submitted: day.submitted })),
                  series: single('submitted', '처음 제출'),
                },
              ]}
            />
          </MetricArea>
          <MetricArea
            title="거절 사유"
            scope="moderation"
            asOf={d.asOf}
            help={contentHelp}>
            <NumericTable
              title="거절 사유"
              collapsible={false}
              headers={['규칙', '종류', '제출본']}
              rows={d.rejectionRules.map((row) => [
                row.rule,
                row.type === 'TEXT' ? '글' : '이미지',
                n(row.submissions, '건'),
              ])}
            />
          </MetricArea>
        </>
      )}
    </DataAreas>
  );
}

export function DepthTab({ query }: { query: string }) {
  return (
    <DataAreas<ChatEngagement>
      url={`/api/chats/engagement?${query}`}
      title="몰입"
      scope="depth"
      cards={3}
      charts={5}>
      {(d) => (
        <MetricArea
          title="몰입"
          scope="depth"
          asOf={d.asOf}
          help="서버 DB 출처 지표입니다. 팀 계정은 제외합니다."
          detail="회원이 자기 채팅에 보낸 메시지로 셉니다. 게스트 채팅은 세지 않습니다.">
          <SummaryCards
            items={[
              { label: '활성 회원', value: n(d.activeMembers, '명') },
              {
                label: '30일 활성 회원',
                value: n(d.monthlyActiveMembers, '명'),
              },
              {
                label: '활성 회원 1인당 턴',
                value:
                  d.turnsPerActiveMember === null
                    ? '활성 회원 없음'
                    : metricNumber(d.turnsPerActiveMember, '턴', 1),
              },
            ]}
          />
          <Charts
            items={(
              [
                ['활성 회원', 'activeMembers', '명', '활성 회원 없음'],
                [
                  '활성 회원 1인당 턴',
                  'turnsPerActiveMember',
                  '턴',
                  '활성 회원 없음',
                ],
                [
                  '이어 가기 비율',
                  'continuationRate',
                  '%',
                  '전날 활성 회원 없음',
                ],
                ['재생성 비율', 'regenerationRate', '%', '턴 없음'],
                ['고착도', 'stickiness', '%', '30일 활성 회원 없음'],
              ] as const
            ).map(([title, key, unit, emptyLabel]) => ({
              title,
              unit,
              emptyLabel,
              series: single(key, title),
              rows: dailyRows(d, (day) => ({
                [key]: day[key],
                continuedMembers: day.continuedMembers,
                regenerations: day.regenerations,
              })),
              tooltipDetail:
                key === 'continuationRate'
                  ? (row) =>
                      `이어 간 회원 ${n(Number(row.continuedMembers), '명')}`
                  : key === 'regenerationRate'
                    ? (row) => `재생성 ${n(Number(row.regenerations), '회')}`
                    : undefined,
            }))}
          />
        </MetricArea>
      )}
    </DataAreas>
  );
}
