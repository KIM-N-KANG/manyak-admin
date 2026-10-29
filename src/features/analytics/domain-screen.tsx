'use client';

import { type ReactNode } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { PageHeading, QueryState } from '@/components/admin/data-ui';
import { ChartsSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { DailyTrends } from '@/features/dashboard/daily-trends';
import type { DateRange, RangeName } from '@/features/dashboard/date-range';
import { DistributionGrid } from '@/features/dashboard/distribution-card';
import { PlayInstallsDetails } from '@/features/dashboard/play-installs-details';
import { RangePicker } from '@/features/dashboard/range-picker';
import type { DashboardCharts } from '@/features/dashboard/types';
import { useApi } from '@/features/shared/use-api';

import {
  AnalyticsScreen,
  FunnelCards,
  MetricsTab,
  Select,
} from './analytics-screen';
import {
  audiences,
  basisText,
  pick,
  platformOptions,
  platformText,
  sourceHelp,
} from './config';
import { infraRange } from './infra/data';
import { InfraScreen } from './infra/infra-screen';
import { MetricScope } from './metric-definition';
import { Source } from './metric-ui';
import { PendingTab } from './pending-dates';
import { analyticsRange } from './range';
import { cohorts } from './retention';
import type { CampaignDefinition } from './types';

export const domains = {
  growth: {
    title: '성장',
    tabs: [
      ['trend', '유입'],
      ['installs', '앱 설치'],
      ['activity', '활동'],
      ['signups', '가입'],
      ['retention', '리텐션'],
    ],
    defaultTab: 'activity',
    list: '/members',
    link: '회원 목록',
  },
  stories: {
    title: '스토리',
    tabs: [
      ['making', '제작'],
      ['creation', '간편 제작 퍼널'],
      ['story-detail', '상세 진입 퍼널'],
    ],
    defaultTab: 'making',
    list: '/stories',
    link: '스토리 목록',
  },
  chats: {
    title: '채팅',
    tabs: [
      ['engagement', '참여'],
      ['chat-options', '옵션과 입력'],
    ],
    defaultTab: 'engagement',
    list: '/chats',
    link: '채팅 목록',
  },
  payments: {
    title: '결제',
    tabs: [],
    defaultTab: 'payments',
    list: '/payments',
    link: '결제 목록',
  },
  ops: {
    title: '운영',
    tabs: [
      ['services', '서비스'],
      ['ai-quality', 'AI 품질'],
      ['ai-cost', 'AI 비용'],
    ],
    defaultTab: 'services',
    list: '',
    link: '',
  },
} as const;
export type DomainName = keyof typeof domains;

const acquisitionTabs = [
  ['trend', '캠페인 추이'],
  ['sources', '유입 소스'],
  ['push', '푸시 열람'],
] as const;
const serviceTabs = [
  ['services', '서비스와 요청'],
  ['storage', '저장소'],
  ['tables', 'DB 테이블'],
] as const;

function TabBar({
  value,
  options,
  label,
  onChange,
  children,
}: {
  children?: ReactNode;
  value: string;
  options: readonly (readonly [string, string])[];
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <Tabs.Root value={value} onValueChange={(value) => onChange(String(value))}>
      <Tabs.List
        aria-label={label}
        className="mb-5 flex overflow-x-auto border-b">
        {options.map(([key, label]) => (
          <Tabs.Tab
            key={key}
            value={key}
            className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground data-active:border-primary data-active:text-primary-text">
            {label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel value={value} keepMounted={false}>
        {children}
      </Tabs.Panel>
    </Tabs.Root>
  );
}

function Area({
  title,
  source,
  children,
}: {
  title: string;
  source?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={`${title} 영역`} className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {source ? <Source source="Amplitude" help={source} /> : null}
      </div>
      {children}
    </section>
  );
}

function DistributionArea({
  title,
  ids,
  query,
  basis,
  children,
}: {
  title: string;
  children?: ReactNode;
  ids: readonly string[];
  query: string;
  basis: string | null;
}) {
  const response = useApi<DashboardCharts>(`/api/dashboard/charts?${query}`);

  return (
    <Area title={title}>
      <QueryState
        skeleton={<ChartsSkeleton count={ids.length} />}
        pending={response.isPending}
        error={response.error}
        retry={response.refetch}
      />
      {response.data && !response.isError ? (
        <DistributionGrid
          distributions={response.data.distributions.filter((item) =>
            ids.includes(item.chartId),
          )}
          basis={basis}
        />
      ) : null}
      {children}
    </Area>
  );
}

function PaymentTrends({
  query,
  basis,
}: {
  query: string;
  basis: string | null;
}) {
  const response = useApi<DashboardCharts>(`/api/dashboard/charts?${query}`);

  return (
    <div className="mb-8">
      <QueryState
        skeleton={<ChartsSkeleton count={4} columns={4} compact />}
        pending={response.isPending}
        error={response.error}
        retry={response.refetch}
      />
      {response.data && !response.isError ? (
        <DailyTrends
          data={response.data}
          selectedMetrics={['payments', 'revenue', 'granted', 'spent']}
          basis={basis}
        />
      ) : null}
    </div>
  );
}

export function DomainScreen({ domain }: { domain: DomainName }) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const config = domains[domain];
  const options: readonly (readonly [string, string])[] = [
    ...config.tabs,
    ...(domain === 'growth'
      ? acquisitionTabs
      : domain === 'ops'
        ? serviceTabs
        : []),
  ];
  const tab = pick(params.get('tab'), options, config.defaultTab);
  const acquisition =
    domain === 'growth' && ['trend', 'sources', 'push'].includes(tab);
  const services =
    domain === 'ops' && ['services', 'storage', 'tables'].includes(tab);
  const campaign =
    (domain === 'growth' && tab === 'trend') ||
    (domain === 'stories' && tab !== 'making');
  const hasPlatform =
    !acquisition &&
    !services &&
    !['creation', 'story-detail', 'installs', 'ai-cost'].includes(tab);
  const hasSegment =
    hasPlatform &&
    [
      'activity',
      'engagement',
      'chat-options',
      'payments',
      'ai-quality',
    ].includes(tab);
  const platform = hasPlatform
    ? pick(params.get('platform'), platformOptions, 'all')
    : 'all';
  const segment = hasSegment
    ? pick(params.get('segment'), audiences, 'all')
    : 'all';
  const catalog = useApi<{ items: CampaignDefinition[] }>(
    '/api/campaigns',
    campaign,
  );
  const selected =
    params.get('campaign') ??
    catalog.data?.items.findLast((item) => item.endDate === null)?.campaign;
  const selectedCampaign = catalog.data?.items.find(
    (item) => item.campaign === selected,
  );
  const range = services
    ? {
        ...infraRange(new URLSearchParams(params)),
        maxDays: 31,
        endDate: undefined,
      }
    : analyticsRange(new URLSearchParams(params), tab, selectedCampaign);

  function update(values: Record<string, string | null>) {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(values)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }

    router.push(`${pathname}?${next}`, { scroll: false });
  }

  function select(value: DateRange | RangeName) {
    update({
      range: typeof value === 'string' ? value : null,
      from: typeof value === 'string' ? null : value.from,
      to: typeof value === 'string' ? null : value.to,
      days: null,
    });
  }

  const query = new URLSearchParams({
    from: range.from,
    to: range.to,
  }).toString();
  const qualityQuery = `${query}&platform=${platform}&segment=${segment}`;
  const shared = { platform, segment, adSegment: 'all' };

  function metrics(
    screen: 'users' | 'quality' | 'conversion',
    key: string,
    title: string,
    url: string,
    qualityPart?: 'input' | 'errors' | 'signals' | 'completion',
  ) {
    const body = (
      <MetricScope value={screen}>
        <MetricsTab
          {...shared}
          screen={screen}
          tab={key}
          title={title}
          url={url}
          qualityPart={qualityPart}
        />
      </MetricScope>
    );

    return title ? (
      <section className="mb-8" aria-label={`${title} 영역`}>
        {body}
      </section>
    ) : (
      <div className="mt-5">{body}</div>
    );
  }

  function funnel(keys: readonly string[]) {
    const limited = analyticsRange(
      new URLSearchParams({ from: range.from, to: range.to }),
      'funnels',
    );

    return (
      <Area title="전환 퍼널" source={sourceHelp.conversion}>
        <MetricScope value="conversion">
          {limited.error ? (
            <Card role="alert">
              <h2 className="font-semibold">기간 확인 필요</h2>
              <p className="my-3 text-sm">
                이 지표는 최대 31일까지 볼 수 있습니다. 기간을 31일 이내로
                선택해 주세요.
              </p>
              <Button
                variant="outline"
                onClick={() => select(limited.adjusted)}>
                최근 31일로 맞추기
              </Button>
            </Card>
          ) : (
            <FunnelCards
              detailBasis={basisText(false, segment !== 'all')}
              only={keys}
              from={range.from}
              to={range.to}
              platform={platform === 'all' ? 'web' : platform}
              story={params.get('storyId') ?? ''}
              onStory={(value) => update({ storyId: value })}
            />
          )}
        </MetricScope>
      </Area>
    );
  }

  const tooLong =
    (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1 > 366;
  const content = (
    <PendingTab key={`${domain}/${tab}/${query}/${platform}/${segment}`}>
      {campaign || acquisition ? (
        <AnalyticsScreen screen="acquisition" embedded />
      ) : services ? (
        <InfraScreen embedded />
      ) : tab === 'installs' ? (
        <MetricScope value="acquisition">
          <PlayInstallsDetails />
        </MetricScope>
      ) : tooLong ? (
        <Card role="alert">
          <h2 className="font-semibold">기간 확인 필요</h2>
          <p className="my-3 text-sm">
            이 지표는 최대 366일까지 볼 수 있습니다. 기간을 366일 이내로 선택해
            주세요.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              select({
                from: new Date(Date.parse(range.to) - 365 * 86400000)
                  .toISOString()
                  .slice(0, 10),
                to: range.to,
              })
            }>
            최근 366일로 맞추기
          </Button>
        </Card>
      ) : (
        <>
          {tab === 'activity' ? (
            <>
              {metrics(
                'users',
                'activity',
                '사용자 활동',
                `/api/users/activity?${query}`,
              )}
              {metrics(
                'users',
                'sessions',
                '세션',
                `/api/users/sessions?${query}&segment=${segment}`,
              )}
            </>
          ) : null}
          {tab === 'signups' ? (
            <>
              {metrics(
                'users',
                'signups',
                '신규 가입자',
                `/api/users/signups?${query}`,
              )}
              {funnel([
                'web-first-visit',
                'android-first-visit',
                'guest-limit-login',
              ])}
            </>
          ) : null}
          {tab === 'retention' ? (
            <RetentionArea
              params={new URLSearchParams(params)}
              platform={platform}
              query={query}
              onChange={(cohort) => update({ cohort })}
              onRange={select}
            />
          ) : null}
          {tab === 'making' ? (
            <>
              {funnel(['story-creation'])}
              <DistributionArea
                title="콘텐츠"
                ids={['creation-mode', 'characters']}
                query={query}
                basis={basisText(platform !== 'all', false)}>
                {metrics(
                  'quality',
                  'client',
                  '',
                  `/api/quality/client?${qualityQuery}`,
                  'completion',
                )}
              </DistributionArea>
            </>
          ) : null}
          {tab === 'engagement' ? (
            <>
              {metrics(
                'conversion',
                'turn-reach',
                '채팅 턴 도달률',
                `/api/conversion/turn-reach?${query}&segment=${segment}`,
              )}
              <DistributionArea
                title="채팅 참여"
                ids={['genre-depth', 'turns', 'first-message']}
                query={query}
                basis={basisText(platform !== 'all', segment !== 'all')}
              />
              <DistributionArea
                title="채팅 소유자"
                ids={['started-as', 'member-chats']}
                query={query}
                basis={basisText(platform !== 'all', segment !== 'all')}
              />
              {funnel(['story-detail-chat'])}
            </>
          ) : null}
          {tab === 'chat-options' ? (
            <>
              {metrics(
                'quality',
                'chat-options',
                '채팅 옵션 비중',
                `/api/quality/chat-options?${query}&segment=${segment}`,
              )}
              {metrics(
                'quality',
                'client',
                '입력 방식',
                `/api/quality/client?${qualityQuery}`,
                'input',
              )}
            </>
          ) : null}
          {domain === 'payments' ? (
            <>
              <PaymentTrends
                query={query}
                basis={basisText(platform !== 'all', segment !== 'all')}
              />
              {metrics(
                'quality',
                'client',
                '이프와 초대 신호',
                `/api/quality/client?${qualityQuery}`,
                'signals',
              )}
            </>
          ) : null}
          {tab === 'ai-quality' ? (
            <>
              <DistributionArea
                title="AI 품질"
                ids={['ai-latency', 'ai-success']}
                query={query}
                basis={basisText(platform !== 'all', segment !== 'all')}
              />
              {metrics(
                'quality',
                'client',
                '오류 표시',
                `/api/quality/client?${qualityQuery}`,
                'errors',
              )}
            </>
          ) : null}
          {tab === 'ai-cost'
            ? metrics(
                'quality',
                'ai-cost',
                'AI 비용',
                `/api/quality/ai-cost?${query}`,
              )
            : null}
        </>
      )}
    </PendingTab>
  );

  return (
    <>
      <PageHeading
        title={config.title}
        help={
          config.list ? (
            <Link
              className="text-sm text-primary-text hover:underline"
              href={config.list}>
              {config.link}
            </Link>
          ) : undefined
        }>
        <div className="flex flex-wrap items-end gap-4">
          {hasPlatform ? (
            <Select
              label="플랫폼"
              value={platform}
              options={platformOptions}
              help={
                ['signups', 'making', 'engagement'].includes(tab)
                  ? platformText.funnelHelp
                  : undefined
              }
              onChange={(value) => update({ platform: value })}
            />
          ) : null}
          {hasSegment ? (
            <Select
              label="대상"
              value={segment}
              options={audiences}
              help={platformText.segmentHelp}
              onChange={(value) => update({ segment: value })}
            />
          ) : null}
          {
            <RangePicker
              disabled={['installs', 'tables'].includes(tab)}
              maxDays={range.maxDays}
              endDate={range.endDate}
              range={{
                ...range,
                label:
                  tab === 'installs'
                    ? '전체 기간'
                    : tab === 'tables'
                      ? '현재'
                      : range.label,
                query,
                select,
              }}
            />
          }
        </div>
      </PageHeading>
      {domain === 'payments' ? (
        content
      ) : (
        <TabBar
          label={`${config.title} 탭`}
          value={acquisition ? 'trend' : services ? 'services' : tab}
          options={config.tabs}
          onChange={(tab) => update({ tab })}>
          {acquisition || services ? (
            <TabBar
              label={acquisition ? '유입 하위 구분' : '서비스 하위 구분'}
              value={tab}
              options={acquisition ? acquisitionTabs : serviceTabs}
              onChange={(tab) => update({ tab })}>
              {content}
            </TabBar>
          ) : (
            content
          )}
        </TabBar>
      )}
    </>
  );
}

function RetentionArea({
  params,
  platform,
  query,
  onChange,
  onRange,
}: {
  params: URLSearchParams;
  platform: string;
  query: string;
  onChange: (value: string) => void;
  onRange: (value: DateRange) => void;
}) {
  const range = analyticsRange(params, 'retention');
  const cohort = pick(params.get('cohort'), cohorts, 'visitor');
  const url = `/api/users/retention?${query}&cohort=${cohort}`;
  const response = useApi<{ cohort?: string }>(url, !range.error);

  return (
    <>
      <div className="mb-6">
        <Select
          label="시작 집단"
          value={response.data?.cohort ?? (response.data ? 'visitor' : cohort)}
          options={cohorts}
          onChange={onChange}
        />
      </div>
      {range.error ? (
        <Card role="alert">
          <h2 className="font-semibold">기간 확인 필요</h2>
          <p className="my-3 text-sm">
            리텐션은 어제까지의 시작일만 볼 수 있습니다. 끝 날짜를 어제 이전으로
            선택해 주세요.
          </p>
          <Button variant="outline" onClick={() => onRange(range.adjusted)}>
            어제까지로 맞추기
          </Button>
        </Card>
      ) : (
        <MetricScope value="users">
          <MetricsTab
            screen="users"
            tab="retention"
            title="리텐션"
            url={url}
            platform={platform}
            segment="all"
            adSegment="all"
          />
        </MetricScope>
      )}
    </>
  );
}
