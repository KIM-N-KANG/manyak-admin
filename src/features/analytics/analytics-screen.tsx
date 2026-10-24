'use client';

import { type RefObject, useId, useRef, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { dateTime, PageHeading, QueryState } from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import type { DateRange, RangeName } from '@/features/dashboard/date-range';
import { PlayInstallsDetails } from '@/features/dashboard/play-installs-details';
import { RangePicker } from '@/features/dashboard/range-picker';
import { useApi } from '@/features/shared/use-api';

import {
  type AnalyticsScreenName,
  funnels,
  pick,
  platformOptions,
  screens,
  segments,
  sourceHelp,
} from './config';
import { kstTime } from './infra/data';
import { PendingDates, Source } from './metric-ui';
import { MetricsSkeleton } from './metrics-skeleton';
import { analyticsRange, analyticsRefetch } from './range';
import {
  AcquisitionContent,
  ConversionContent,
  QualityContent,
  UserContent,
} from './tab-content';
import type { CampaignDefinition } from './types';

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs text-muted-foreground">
      {label}
      <select
        className="control"
        value={value}
        onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
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
}: {
  screen: AnalyticsScreenName;
  tab: string;
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
  const title = screens[screen].tabs.find(([key]) => key === tab)?.[1] ?? '';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {help ? (
        <Source source={source} help={help} />
      ) : (
        <span className="text-xs text-muted-foreground">{source}</span>
      )}
    </div>
  );
}

function MetricsTab({
  screen,
  tab,
  url,
  platform,
  segment,
}: {
  screen: AnalyticsScreenName;
  tab: string;
  url: string;
  platform: string;
  segment: string;
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
      }
    | undefined;
  const db = ['signups', 'turn-reach', 'chat-options', 'ai-cost'].includes(tab);

  return (
    <>
      <TabHeading
        screen={screen}
        tab={tab}
        aiCost={query.isError ? undefined : data}
      />
      <QueryState
        skeleton={<MetricsSkeleton tab={tab} />}
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
          {data.campaign || data.storyId || data.platform ? (
            <p className="mb-4 text-xs text-muted-foreground">
              {[
                data.campaign && `광고 캠페인 ${data.campaign}`,
                data.storyId && `대상 스토리 ${data.storyId}`,
                data.platform &&
                  `플랫폼 ${platformOptions.find(([key]) => key === data.platform)?.[1] ?? data.platform}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          ) : null}
          <PendingDates dates={data.pendingDates ?? []} />
          {screen === 'acquisition' ? (
            <AcquisitionContent tab={tab} data={data} segment={segment} />
          ) : screen === 'users' ? (
            <UserContent tab={tab} data={data} platform={platform} />
          ) : screen === 'conversion' ? (
            <ConversionContent tab={tab} data={data} />
          ) : (
            <QualityContent tab={tab} data={data} />
          )}
        </>
      ) : null}
    </>
  );
}

export function AnalyticsScreen({ screen }: { screen: AnalyticsScreenName }) {
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
    screen === 'acquisition' && !['installs', 'push'].includes(tab),
  );
  const selectedCampaign =
    params.get('campaign') ??
    catalog.data?.items.findLast((item) => item.endDate === null)?.campaign ??
    '';
  const campaign = catalog.data?.items.find(
    (item) => item.campaign === selectedCampaign,
  );
  const range = analyticsRange(new URLSearchParams(params), tab, campaign);
  const funnel = pick(params.get('funnel'), funnels, 'web-first-visit');
  const platform = pick(
    params.get('platform'),
    platformOptions,
    screen === 'conversion' ? 'web' : 'all',
  );
  const funnelPlatform = platform === 'all' ? 'web' : platform;
  const segment = pick(params.get('segment'), segments, 'all');
  const needsCampaign =
    screen === 'acquisition' && !['sources', 'installs', 'push'].includes(tab);
  const story =
    params.get('storyId') ??
    (needsCampaign && tab === 'story-detail' ? (campaign?.storyId ?? '') : '');
  const needsStory =
    (needsCampaign && tab === 'story-detail') ||
    (screen === 'conversion' &&
      tab === 'funnels' &&
      funnel === 'story-detail-chat');
  const invalidStory =
    needsStory &&
    story !== '' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      story,
    );
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
        : tab === 'push'
          ? '/campaigns/push-opens'
          : tab === 'sources'
            ? '/campaigns/sources'
            : `/campaigns/funnels/${tab}`
      : screen === 'conversion'
        ? tab === 'funnels'
          ? `/conversion/funnels/${funnel}`
          : '/conversion/turn-reach'
        : `/${screen}/${tab}`;

  if (screen === 'quality' && tab === 'client') query.set('platform', platform);

  const showFunnelPlatform =
    screen === 'conversion' &&
    tab === 'funnels' &&
    !['web-first-visit', 'android-first-visit'].includes(funnel);

  if (showFunnelPlatform) query.set('platform', funnelPlatform);

  path = `/api${path}?${query}`;

  return (
    <>
      <PageHeading title={config.title}>
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
      </PageHeading>
      <Tabs.Root
        value={tab}
        onValueChange={(value) => update({ tab: String(value) })}>
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
        <div className="mb-6 flex flex-wrap items-end gap-4">
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
          {tab === 'creation' ? (
            <Select
              label="광고 구분"
              value={segment}
              options={segments}
              onChange={(value) => update({ segment: value })}
            />
          ) : null}
          {screen === 'conversion' && tab === 'funnels' ? (
            <Select
              label="퍼널"
              value={funnel}
              options={funnels}
              onChange={(value) => update({ funnel: value })}
            />
          ) : null}
          {showFunnelPlatform || tab === 'retention' || tab === 'client' ? (
            <Select
              label="플랫폼"
              value={showFunnelPlatform ? funnelPlatform : platform}
              options={
                showFunnelPlatform ? platformOptions.slice(1) : platformOptions
              }
              onChange={(value) => update({ platform: value })}
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
                <Card role="alert">
                  <h2 className="font-semibold">기간 확인 필요</h2>
                  <p className="my-3 text-sm">
                    {range.error === 'retention'
                      ? '리텐션은 어제까지의 신규 방문일만 볼 수 있습니다. 끝 날짜를 어제 이전으로 선택해 주세요.'
                      : `이 탭은 최대 ${range.maxDays}일까지 볼 수 있습니다. 기간을 ${range.maxDays}일 이내로 선택해 주세요.`}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => selectRange(range.adjusted)}>
                    {range.error === 'retention'
                      ? '어제까지로 맞추기'
                      : `최근 ${range.maxDays}일로 맞추기`}
                  </Button>
                </Card>
              ) : missingCampaign ? (
                <p role="status">
                  진행 중인 광고 캠페인이 없습니다. 광고 캠페인을 선택해 주세요.
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
              ) : invalidStory ? null : (
                <MetricsTab
                  key={`${screen}/${tab}`}
                  screen={screen}
                  tab={tab}
                  url={path}
                  platform={platform}
                  segment={segment}
                />
              )}
            </>
          )}
        </Tabs.Panel>
      </Tabs.Root>
    </>
  );
}
