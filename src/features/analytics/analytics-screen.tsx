'use client';

import { type ReactNode, type RefObject, useId, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { dateTime, PageHeading, QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import type { DateRange, RangeName } from '@/features/dashboard/date-range';
import { PlayInstallsDetails } from '@/features/dashboard/play-installs-details';
import { RangePicker } from '@/features/dashboard/range-picker';
import { useApi } from '@/features/shared/use-api';

import {
  adSegments,
  type AnalyticsScreenName,
  audiences,
  audienceText,
  funnels,
  pick,
  platformOptions,
  platformTabs,
  platformText,
  screens,
  segmentTabs,
  sourceHelp,
} from './config';
import { AppActivationContent } from './growth-content';
import { kstTime } from './infra/data';
import { MetricHelp, MetricScope } from './metric-definition';
import { FunnelChart, PendingDates, Source } from './metric-ui';
import { MetricsSkeleton } from './metrics-skeleton';
import { PendingTab } from './pending-dates';
import { analyticsRange, analyticsRefetch } from './range';
import { cohorts } from './retention';
import { SessionLengths } from './session-lengths';
import {
  AcquisitionContent,
  ConversionContent,
  QualityContent,
  UserContent,
} from './tab-content';
import type {
  AppActivationResponse,
  CampaignDefinition,
  ConversionResponse,
} from './types';

export function Select({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
  help?: string;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <label htmlFor={id}>{label}</label>
        {help ? (
          <HelpTooltip label={`${label} 도움말`}>{help}</HelpTooltip>
        ) : null}
      </span>
      <select
        id={id}
        className="control"
        value={value}
        onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextCondition({
  label,
  value,
  onApply,
  maxLength,
  inputRef,
}: {
  label: string;
  value: string;
  onApply: (value: string) => void;
  maxLength?: number;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const id = useId();

  return (
    <form
      key={value}
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(
          String(new FormData(event.currentTarget).get('value') ?? '').trim(),
        );
      }}>
      <label
        htmlFor={id}
        className="flex flex-col gap-2 text-xs text-muted-foreground">
        {label}
        <input
          ref={inputRef}
          id={id}
          className="control max-w-full"
          name="value"
          defaultValue={value}
          maxLength={maxLength}
          required={label === 'UTM 캠페인 값'}
          minLength={label === 'UTM 캠페인 값' ? 1 : undefined}
        />
      </label>
      <Button type="submit" variant="outline">
        적용
      </Button>
    </form>
  );
}

function TabHeading({
  screen,
  tab,
  aiCost,
  title: headingTitle,
}: {
  screen: AnalyticsScreenName;
  tab: string;
  title?: string;
  aiCost?: {
    asOf: string | null;
    usdKrwRate?: number;
    chatImageUnitCostKrw?: number;
  };
}) {
  const db = ['signups', 'turn-reach', 'chat-options', 'ai-cost'].includes(tab);
  const source = tab === 'ai-cost' ? 'Langfuse' : db ? '서버 DB' : 'Amplitude';
  const template =
    sourceHelp[tab as keyof typeof sourceHelp] ?? sourceHelp[screen];
  const help =
    tab === 'ai-cost'
      ? aiCost &&
        typeof aiCost.usdKrwRate === 'number' &&
        typeof aiCost.chatImageUnitCostKrw === 'number'
        ? template
            .replace(
              'Langfuse 출처 지표이며 {받은 시각} KST에 받은 값입니다.',
              aiCost.asOf === null
                ? 'Langfuse 출처 지표입니다.'
                : `Langfuse 출처 지표이며 ${kstTime(aiCost.asOf)} KST에 받은 값입니다.`,
            )
            .replace(
              '{환율}',
              aiCost.usdKrwRate.toLocaleString('ko-KR', {
                useGrouping: false,
                maximumFractionDigits: 2,
              }),
            )
            .replace(
              '{장당 원가}',
              aiCost.chatImageUnitCostKrw.toLocaleString('ko-KR', {
                maximumFractionDigits: 2,
              }),
            )
        : undefined
      : template;
  const title =
    headingTitle ??
    (
      {
        activation: '첫 방문 활성화 퍼널',
        app: '앱 배너와 설치 경로',
        'app-activation': '앱 신규 활성 사용자',
      } as Record<string, string>
    )[tab] ??
    screens[screen].tabs.find(([key]) => key === tab)?.[1] ??
    '';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <MetricHelp title={title} />
      {[
        'app-activation',
        'activation',
        'reach',
        'creatives',
        'sources',
        'push',
      ].includes(tab) ? (
        <span className="rounded-sm border bg-muted px-2 py-0.5 text-xs">
          {tab === 'app-activation' ? '앱' : '웹'}
        </span>
      ) : null}
      {help ? (
        <Source source={source} help={help} />
      ) : (
        <span className="text-xs text-muted-foreground">{source}</span>
      )}
    </div>
  );
}

export function MetricsTab({
  screen,
  tab,
  url,
  platform,
  segment,
  adSegment,
  title,
  qualityPart,
}: {
  screen: AnalyticsScreenName;
  tab: string;
  url: string;
  platform: string;
  segment: string;
  adSegment: string;
  title?: string;
  qualityPart?: 'input' | 'errors' | 'signals' | 'completion' | 'activity';
}) {
  const query = useApi<unknown>(url, true, {
    refetchInterval: (query) =>
      analyticsRefetch(
        query as {
          state: {
            data?: {
              pendingDates?: string[];
              monthlyActiveUsers?: number | null;
            };
          };
        },
      ),
  });
  const data = query.data as
    | {
        asOf: string | null;
        chatImageUnitCostKrw?: number;
        usdKrwRate?: number;
        pendingDates?: string[];
        campaign?: string;
        storyId?: string | null;
        platform?: string;
        segment?: string;
      }
    | undefined;
  // 세 탭의 준비 중 날짜는 Amplitude 값에만 적용돼 그 영역 위에 따로 보인다.
  const audience = audienceText(data?.segment);
  const db = ['signups', 'turn-reach', 'chat-options', 'ai-cost'].includes(tab);

  return (
    <>
      {title !== '' ? (
        <TabHeading
          screen={screen}
          tab={tab}
          aiCost={query.isError ? undefined : data}
          title={title}
        />
      ) : null}
      <QueryState
        skeleton={
          <MetricsSkeleton
            tab={qualityPart === 'activity' ? 'activity-volume' : tab}
          />
        }
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
        source={tab === 'ai-cost' ? 'langfuse' : db ? undefined : 'amplitude'}
      />
      {data && !query.isError ? (
        <>
          {tab !== 'ai-cost' && data.asOf ? (
            <p className="mb-4 text-xs text-muted-foreground">
              {dateTime(data.asOf)} KST 집계 기준
            </p>
          ) : null}
          {data.campaign || data.storyId || data.platform || audience ? (
            <p className="mb-4 text-xs text-muted-foreground">
              {[
                data.campaign && `광고 캠페인 ${data.campaign}`,
                data.storyId && `대상 스토리 ${data.storyId}`,
                data.platform &&
                  `플랫폼 ${platformOptions.find(([key]) => key === data.platform)?.[1] ?? data.platform}`,
                audience,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : null}
          <PendingDates dates={data.pendingDates ?? []} />
          {tab === 'app-activation' ? (
            <AppActivationContent
              data={data as unknown as AppActivationResponse}
            />
          ) : screen === 'acquisition' ? (
            <AcquisitionContent tab={tab} data={data} segment={adSegment} />
          ) : screen === 'users' ? (
            <UserContent
              tab={tab}
              data={data}
              platform={platform}
              segment={segment}
            />
          ) : screen === 'conversion' ? (
            <ConversionContent
              data={data}
              platform={platform}
              segment={segment}
            />
          ) : (
            <QualityContent
              part={qualityPart}
              tab={tab}
              data={data}
              platform={platform}
              segment={segment}
            />
          )}
        </>
      ) : null}
      {tab === 'activation' ? (
        <section className="mt-8" aria-label="누적 도달 영역">
          <MetricsTab
            screen="acquisition"
            tab="reach"
            title="누적 도달"
            url={url.replace('/funnels/activation?', '/reach?')}
            platform="all"
            segment="all"
            adSegment={adSegment}
          />
        </section>
      ) : null}
      {tab === 'app' ? <AppFunnel url={url} /> : null}
      {tab === 'sessions' ? (
        <SessionLengths
          url={url.replace('/users/sessions?', '/users/session-lengths?')}
          platform={platform}
        />
      ) : null}
    </>
  );
}

const storyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 전환 퍼널 하나를 따로 요청하고 그 카드 안에서만 상태를 보이는 카드다. */
function FunnelCard({
  label,
  platform,
  url,
  children,
  help,
  basis,
}: {
  label: string;
  platform: string;
  url: string | null;
  children?: ReactNode;
  help?: string;
  basis?: string | null;
}) {
  const query = useApi<ConversionResponse>(url ?? '', url !== null);
  const id = useId();

  return (
    <section aria-labelledby={id} className="border-t pt-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 id={id} className="text-lg font-semibold">
          {label}
        </h3>
        {basis ? (
          <span className="text-xs text-muted-foreground">{basis}</span>
        ) : null}
        <MetricHelp title={label} noEvents={query.data?.steps[0]?.users === 0}>
          {help}
        </MetricHelp>
        {platform ? (
          <span className="rounded-sm border bg-muted px-2 py-0.5 text-xs">
            {platformOptions.find(([key]) => key === platform)?.[1]}
          </span>
        ) : null}
      </div>
      {children}
      {url === null ? null : (
        <>
          <QueryState
            skeleton={<MetricsSkeleton tab="funnels" />}
            pending={query.isPending}
            error={query.error}
            retry={query.refetch}
            source="amplitude"
          />
          {query.data && !query.isError ? (
            <>
              {query.data.asOf ? (
                <p className="mb-4 text-xs text-muted-foreground">
                  {dateTime(query.data.asOf)} KST 집계 기준
                </p>
              ) : null}
              <FunnelChart
                steps={query.data.steps}
                help={help}
                definitionTitle={label}
              />
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

/** 선택한 전환 퍼널 카드를 정해진 순서로 놓고 퍼널마다 따로 요청한다. */
export function FunnelCards({
  from,
  to,
  platform,
  story,
  onStory,
  only,
  detailBasis,
}: {
  from: string;
  to: string;
  platform: string;
  story: string;
  onStory: (value: string) => void;
  only?: readonly string[];
  detailBasis?: string | null;
}) {
  const invalidStory = story !== '' && !storyPattern.test(story);

  return (
    <div className="space-y-6">
      {funnels
        .filter(([key]) => !only || only.includes(key))
        .map(([funnel, label]) => {
          const fixed =
            funnel === 'web-first-visit'
              ? 'web'
              : ['android-first-visit', 'android-activation'].includes(funnel)
                ? 'android'
                : null;
          const query = new URLSearchParams({ from, to });
          const detail = funnel === 'story-detail-chat';

          if (detail && story) query.set('storyId', story);

          if (!fixed && funnel !== 'web-to-android')
            query.set('platform', platform);

          return (
            <FunnelCard
              key={funnel}
              label={label}
              basis={detail ? detailBasis : null}
              platform={funnel === 'web-to-android' ? '' : (fixed ?? platform)}
              url={
                detail && invalidStory
                  ? null
                  : `/api/conversion/funnels/${funnel}?${query}`
              }>
              {detail ? (
                <div className="mb-4">
                  <TextCondition
                    label="대상 스토리 공개 식별자"
                    value={story}
                    onApply={onStory}
                  />
                  {invalidStory ? (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      스토리 공개 식별자 형식을 확인해 주세요.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </FunnelCard>
          );
        })}
    </div>
  );
}

export function AnalyticsScreen({
  screen,
  embedded = false,
}: {
  screen: AnalyticsScreenName;
  embedded?: boolean;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const [custom, setCustom] = useState(false);
  const storyInput = useRef<HTMLInputElement>(null);
  const config = screens[screen];
  const requestedTab = params.get('tab');
  const tab = pick(
    screen === 'acquisition' && requestedTab === 'play-installs'
      ? 'installs'
      : requestedTab,
    config.tabs,
    config.tabs[0][0],
  );
  const catalog = useApi<{ items: CampaignDefinition[] }>(
    '/api/campaigns',
    screen === 'acquisition' &&
      ['trend', 'activation', 'creatives', 'creation', 'story-detail'].includes(
        tab,
      ),
  );
  const selectedCampaign =
    params.get('campaign') ??
    catalog.data?.items.findLast((item) => item.endDate === null)?.campaign ??
    '';
  const campaign = catalog.data?.items.find(
    (item) => item.campaign === selectedCampaign,
  );
  const range = analyticsRange(new URLSearchParams(params), tab, campaign);
  // 플랫폼과 대상은 모든 지표 화면이 함께 쓰고 그 탭이 쓰지 않으면 읽지도 지우지도 않는다.
  const hasPlatform = platformTabs.includes(tab);
  const hasSegment = segmentTabs.includes(tab);
  const platform = hasPlatform
    ? pick(params.get('platform'), platformOptions, 'all')
    : 'all';
  const segment = hasSegment
    ? pick(params.get('segment'), audiences, 'all')
    : 'all';
  // 전환 퍼널은 웹과 앱을 더해 세지 않아 전체를 웹으로 요청한다.
  const funnelPlatform = platform === 'all' ? 'web' : platform;
  const adSegment = pick(params.get('adSegment'), adSegments, 'all');
  const funnelList = screen === 'conversion' && tab === 'funnels';
  const needsCampaign =
    screen === 'acquisition' &&
    !['sources', 'installs', 'push', 'app'].includes(tab);
  const story =
    params.get('storyId') ??
    (needsCampaign && tab === 'story-detail' ? (campaign?.storyId ?? '') : '');
  const needsStory = needsCampaign && tab === 'story-detail';
  const invalidStory = needsStory && story !== '' && !storyPattern.test(story);
  const missingCampaign = needsCampaign && (!selectedCampaign || custom);
  const missingStory = needsCampaign && tab === 'story-detail' && !story;
  const catalogPending = needsCampaign && catalog.isPending;
  const catalogFailed = needsCampaign && catalog.isError;

  function update(values: Record<string, string | null>) {
    const next = new URLSearchParams(params);

    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }

    router.push(`${pathname}?${next}`, { scroll: false });
  }

  function selectRange(value: DateRange | RangeName) {
    update({
      range: typeof value === 'string' ? value : null,
      from: typeof value === 'string' ? null : value.from,
      to: typeof value === 'string' ? null : value.to,
      days: null,
    });
  }

  function selectCampaign(value: string) {
    if (value === '__custom__') {
      setCustom(true);

      return;
    }

    setCustom(false);
    update({
      campaign: value,
      range: null,
      from: null,
      to: null,
      days: null,
      storyId: null,
    });
  }

  const query = new URLSearchParams({ from: range.from, to: range.to });

  if (needsCampaign) query.set('campaign', selectedCampaign);

  if (needsStory && params.get('storyId'))
    query.set('storyId', params.get('storyId')!);

  let path =
    screen === 'acquisition'
      ? tab === 'trend'
        ? '/campaigns/analytics'
        : tab === 'creatives'
          ? '/campaigns/creatives'
          : tab === 'app'
            ? '/campaigns/app-transfer'
            : tab === 'push'
              ? '/campaigns/push-opens'
              : tab === 'sources'
                ? '/campaigns/sources'
                : `/campaigns/funnels/${tab}`
      : screen === 'conversion'
        ? '/conversion/turn-reach'
        : `/${screen}/${tab}`;

  if (screen === 'quality' && tab === 'client') query.set('platform', platform);

  if (hasSegment) query.set('segment', segment);

  if (tab === 'retention')
    query.set('cohort', pick(params.get('cohort'), cohorts, 'visitor'));

  path = `/api${path}?${query}`;

  return (
    <MetricScope value={screen}>
      {!embedded ? (
        <PageHeading title={config.title}>
          <div className="flex flex-wrap items-end gap-4">
            {hasPlatform ? (
              <Select
                label="플랫폼"
                value={platform}
                options={platformOptions}
                help={funnelList ? platformText.funnelHelp : undefined}
                onChange={(value) => update({ platform: value })}
              />
            ) : null}
            {hasSegment ? (
              <Select
                label={platformText.segmentLabel}
                help={platformText.segmentHelp}
                value={segment}
                options={audiences}
                onChange={(value) => update({ segment: value })}
              />
            ) : null}
            <RangePicker
              disabled={tab === 'installs'}
              range={{
                ...range,
                label: tab === 'installs' ? '전체 기간' : range.label,
                query: new URLSearchParams({
                  from: range.from,
                  to: range.to,
                }).toString(),
                select: selectRange,
              }}
              maxDays={range.maxDays}
              endDate={range.endDate}
            />
          </div>
        </PageHeading>
      ) : null}
      <Tabs.Root
        value={tab}
        onValueChange={(value) => update({ tab: String(value) })}>
        {!embedded ? (
          <Tabs.List
            aria-label={`${config.title} 탭`}
            className="mb-5 flex overflow-x-auto border-b">
            {config.tabs.map(([key, label]) => (
              <Tabs.Tab
                key={key}
                value={key}
                className="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground data-active:border-primary data-active:text-primary-text">
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        ) : null}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          {tab === 'retention' ? (
            <RetentionSelect
              enabled={!range.error}
              url={path}
              value={pick(params.get('cohort'), cohorts, 'visitor')}
              onChange={(value) => update({ cohort: value })}
            />
          ) : null}
          {needsCampaign ? (
            <>
              <Select
                label="광고 캠페인"
                value={
                  custom || (!campaign && selectedCampaign)
                    ? '__custom__'
                    : selectedCampaign
                }
                options={[
                  ['', '선택해 주세요'],
                  ...(catalog.data?.items ?? []).map(
                    (item) =>
                      [
                        item.campaign,
                        `${item.name} (${item.startDate} ~ ${item.endDate ?? '진행 중'})`,
                      ] as const,
                  ),
                  ['__custom__', '직접 입력'],
                ]}
                onChange={selectCampaign}
              />
              {custom || (!campaign && selectedCampaign) ? (
                <TextCondition
                  label="UTM 캠페인 값"
                  value={custom ? '' : selectedCampaign}
                  maxLength={100}
                  onApply={selectCampaign}
                />
              ) : null}
            </>
          ) : null}
          {['creation', 'activation'].includes(tab) ? (
            <Select
              label="광고 구분"
              value={adSegment}
              options={adSegments}
              onChange={(value) => update({ adSegment: value })}
            />
          ) : null}
          {needsStory ? (
            <div>
              <TextCondition
                label="대상 스토리 공개 식별자"
                inputRef={storyInput}
                value={story}
                onApply={(value) => update({ storyId: value })}
              />
              {invalidStory ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  스토리 공개 식별자 형식을 확인해 주세요.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <Tabs.Panel value={tab} keepMounted={false}>
          <PendingTab key={tab}>
            {tab === 'installs' ? (
              <PlayInstallsDetails />
            ) : (
              <>
                {catalogPending ||
                catalogFailed ||
                range.error ||
                missingCampaign ||
                missingStory ||
                invalidStory ? (
                  <TabHeading screen={screen} tab={tab} />
                ) : null}
                {catalogPending || catalogFailed ? (
                  <QueryState
                    skeleton={<MetricsSkeleton tab={tab} />}
                    pending={catalogPending}
                    error={catalogFailed ? catalog.error : null}
                    retry={catalog.refetch}
                  />
                ) : range.error ? (
                  <>
                    <Card role="alert">
                      <h2 className="font-semibold">기간 확인 필요</h2>
                      <p className="my-3 text-sm">
                        {range.error === 'retention'
                          ? '리텐션은 어제까지의 시작일만 볼 수 있습니다. 끝 날짜를 어제 이전으로 선택해 주세요.'
                          : `이 지표는 최대 ${range.maxDays}일까지 볼 수 있습니다. 기간을 ${range.maxDays}일 이내로 선택해 주세요.`}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => selectRange(range.adjusted)}>
                        {range.error === 'retention'
                          ? '어제까지로 맞추기'
                          : `최근 ${range.maxDays}일로 맞추기`}
                      </Button>
                    </Card>
                    {tab === 'activation' ? (
                      <section className="mt-8" aria-label="누적 도달 영역">
                        <TabHeading
                          screen="acquisition"
                          tab="reach"
                          title="누적 도달"
                        />
                        <Card role="alert">
                          <h2 className="font-semibold">기간 확인 필요</h2>
                          <p className="my-3 text-sm">
                            이 지표는 최대 31일까지 볼 수 있습니다. 기간을 31일
                            이내로 선택해 주세요.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => selectRange(range.adjusted)}>
                            최근 31일로 맞추기
                          </Button>
                        </Card>
                      </section>
                    ) : null}
                  </>
                ) : missingCampaign ? (
                  <p role="status">
                    진행 중인 광고 캠페인이 없습니다. 광고 캠페인을 선택해
                    주세요.
                  </p>
                ) : missingStory ? (
                  <div>
                    <p role="status">
                      이 광고 캠페인에는 대상 스토리가 없습니다. 스토리 공개
                      식별자를 입력해 주세요.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => storyInput.current?.focus()}>
                      스토리 공개 식별자 입력
                    </Button>
                  </div>
                ) : invalidStory ? null : funnelList ? (
                  <>
                    <TabHeading screen={screen} tab={tab} />
                    <FunnelCards
                      only={[
                        'web-first-visit',
                        'android-first-visit',
                        'story-creation',
                        'story-detail-chat',
                        'guest-limit-login',
                      ]}
                      from={range.from}
                      to={range.to}
                      platform={funnelPlatform}
                      story={params.get('storyId') ?? ''}
                      onStory={(value) => update({ storyId: value })}
                    />
                  </>
                ) : (
                  <MetricsTab
                    key={`${screen}/${tab}`}
                    screen={screen}
                    tab={tab}
                    url={path}
                    platform={platform}
                    segment={segment}
                    adSegment={adSegment}
                  />
                )}
              </>
            )}
          </PendingTab>
        </Tabs.Panel>
      </Tabs.Root>
    </MetricScope>
  );
}

function RetentionSelect({
  enabled,
  url,
  value,
  onChange,
}: {
  enabled: boolean;
  url: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const query = useApi<{ cohort?: string }>(url, enabled);

  return (
    <Select
      label="시작 집단"
      value={query.data ? (query.data.cohort ?? 'visitor') : value}
      options={cohorts}
      onChange={onChange}
    />
  );
}

function AppFunnel({ url }: { url: string }) {
  const router = useRouter(),
    pathname = usePathname(),
    current = useSearchParams();
  const params = new URLSearchParams(url.split('?')[1]);
  const from = params.get('from')!,
    to = params.get('to')!;
  const range = analyticsRange(params, 'funnels');

  function adjust() {
    const next = new URLSearchParams(current);

    next.delete('range');
    next.delete('days');
    next.set('from', range.adjusted.from);
    next.set('to', range.adjusted.to);
    router.push(`${pathname}?${next}`, { scroll: false });
  }

  return (
    <section className="mt-8" aria-label="웹 이용 후 앱 이용 영역">
      {range.error ? (
        <Card role="alert">
          <h2 className="font-semibold">기간 확인 필요</h2>
          <p className="my-3 text-sm">
            이 지표는 최대 31일까지 볼 수 있습니다. 기간을 31일 이내로 선택해
            주세요.
          </p>
          <Button variant="outline" onClick={adjust}>
            최근 31일로 맞추기
          </Button>
        </Card>
      ) : (
        <FunnelCards
          only={['web-to-android']}
          from={from}
          to={to}
          platform="web"
          story=""
          onStory={() => {}}
        />
      )}
    </section>
  );
}
