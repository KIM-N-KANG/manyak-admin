'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  DataTable,
  NumberValue,
  PageHeading,
  QueryState,
} from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  type DeliveryRow,
  type DeliveryStats,
  notificationTypes,
} from '@/features/notifications/types';
import { useApi } from '@/features/shared/use-api';

const DeliveryChart = dynamic(
  () =>
    import('@/features/notifications/delivery-chart').then(
      (m) => m.DeliveryChart,
    ),
  { loading: () => <p role="status">차트를 불러오는 중입니다…</p> },
);

type Aggregate = {
  label: string;
  requested: number;
  deliveredMembers: number;
  deliveredDevices: number;
  failedDevices: number;
};

export function aggregateDelivery(
  items: DeliveryRow[],
  group: 'date' | 'type',
): Aggregate[] {
  const rows = new Map<string, Aggregate>();

  for (const item of items) {
    const label = item[group];
    const row = rows.get(label) ?? {
      label,
      requested: 0,
      deliveredMembers: 0,
      deliveredDevices: 0,
      failedDevices: 0,
    };

    for (const k of [
      'requested',
      'deliveredMembers',
      'deliveredDevices',
      'failedDevices',
    ] as const)
      row[k] += item[k];

    rows.set(label, row);
  }

  return [...rows.values()].toSorted((a, b) => a.label.localeCompare(b.label));
}
export function StatsScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [group, setGroup] = useState<'date' | 'type'>('date');
  const q = useApi<DeliveryStats>(
    `/api/notifications/delivery-stats?${params}`,
  );

  async function apply(form: FormData) {
    const from = String(form.get('from'));
    const to = String(form.get('to'));

    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 + 1 > 366) {
      setError(
        '시작일과 종료일을 확인하세요. 최대 366일까지 조회할 수 있습니다.',
      );

      return;
    }

    setError('');

    const next = new URLSearchParams();

    for (const [k, v] of form.entries()) if (String(v)) next.set(k, String(v));

    router.push(`/notifications/stats?${next}`);
  }

  const rows = q.data ? aggregateDelivery(q.data.items, group) : [];

  return (
    <>
      <PageHeading
        title="발송 통계"
        description="KST 날짜 기준으로 완료된 발송 결과를 조회하세요."
      />
      <form
        key={params.toString() + String(q.data?.from)}
        action={apply}
        className="mb-6 flex flex-wrap items-end gap-4 rounded-md border bg-card p-5">
        {[
          ['from', '시작일'],
          ['to', '종료일'],
        ].map(([k, label]) => (
          <label key={k} className="grid gap-2 text-sm">
            {label}
            <input
              className="control"
              type="date"
              name={k}
              required
              defaultValue={
                params.get(k) ?? (k === 'from' ? q.data?.from : q.data?.to)
              }
            />
          </label>
        ))}
        <label className="grid gap-2 text-sm">
          알림 종류
          <select
            name="type"
            className="control"
            defaultValue={params.get('type') ?? ''}>
            <option value="">전체</option>
            {notificationTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          알림 성격
          <select
            name="kind"
            className="control"
            defaultValue={params.get('kind') ?? ''}>
            <option value="">전체</option>
            <option value="SERVICE">정보성</option>
            <option value="MARKETING">광고성</option>
          </select>
        </label>
        <Button type="submit">조회</Button>
        {error ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data ? (
        <>
          <label className="mb-4 flex items-center gap-3 text-sm">
            집계 기준
            <select
              className="control"
              value={group}
              onChange={(e) => setGroup(e.target.value as 'date' | 'type')}>
              <option value="date">날짜별</option>
              <option value="type">종류별</option>
            </select>
          </label>
          <Card className="mb-6">
            <h2 className="mb-4 font-semibold">
              {group === 'date' ? '날짜별' : '종류별'} 도달 메시지 수
            </h2>
            {rows.length ? (
              <DeliveryChart items={rows} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                해당 기간의 발송 결과가 없습니다.
              </p>
            )}
          </Card>
          <DataTable
            headers={[
              group === 'date' ? 'KST 날짜' : '종류',
              '발송 요청',
              '도달 메시지 수 (건)',
              '도달 기기',
              '실패 기기',
            ]}
            empty={!rows.length}>
            {rows.map((i) => (
              <tr key={i.label}>
                <td>{i.label}</td>
                {[
                  i.requested,
                  i.deliveredMembers,
                  i.deliveredDevices,
                  i.failedDevices,
                ].map((v, j) => (
                  <td key={j}>
                    <NumberValue value={v} />
                  </td>
                ))}
              </tr>
            ))}
          </DataTable>
          <p className="mt-4 text-sm text-muted-foreground">
            발송 요청은 처리가 끝난 메시지 수입니다. 도달 메시지 수은 도달
            기기가 하나 이상인 메시지 수로, 기간 합계는 중복을 제거한 회원 수가
            아닙니다.
          </p>
        </>
      ) : null}
    </>
  );
}
