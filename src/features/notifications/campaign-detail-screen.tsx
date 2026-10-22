'use client';

import { useState } from 'react';

import {
  dateTime,
  DetailGrid,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import type { Campaign } from '@/features/notifications/types';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import { useApi } from '@/features/shared/use-api';

export function CampaignDetailScreen({ id }: { id: string }) {
  const q = useApi<Campaign>(`/api/notifications/campaigns/${id}`);
  const item = q.data;
  const m = useManagementMutation();
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');

  async function confirm() {
    if (
      await m.run<Campaign>(
        `/api/notifications/campaigns/${id}/${action}`,
        'POST',
        { reason },
      )
    )
      setAction('');
  }

  return (
    <>
      <PageHeading
        title="캠페인 상세"
        description="대상부터 실제 도달까지 단계를 나누어 확인하세요.">
        <TextLink href="/notifications/campaigns">목록으로</TextLink>
      </PageHeading>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {item ? (
        <>
          <Card>
            <h2 className="mb-5 text-xl font-semibold">{item.title}</h2>
            <DetailGrid
              items={[
                ['상태', item.status],
                ['종류', item.kind === 'SERVICE' ? '정보성' : '광고성'],
                ['예약 시각', dateTime(item.scheduledAt)],
                ['시작 시각', item.startedAt ? dateTime(item.startedAt) : '—'],
                [
                  '종료 시각',
                  item.finishedAt ? dateTime(item.finishedAt) : '—',
                ],
                [
                  '이동 대상 스토리',
                  item.storyId ? (
                    <TextLink href={`/stories/${item.storyId}`}>
                      {item.storyId}
                    </TextLink>
                  ) : (
                    '—'
                  ),
                ],
                [
                  '연결 공지',
                  item.noticeId ? (
                    <TextLink href={`/notices/${item.noticeId}`}>
                      {item.noticeId}
                    </TextLink>
                  ) : (
                    '—'
                  ),
                ],
              ]}
            />
            <p className="mt-6 text-sm whitespace-pre-wrap">{item.body}</p>
          </Card>
          <ol
            aria-label="발송 단계"
            className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['대상 회원', item.targetCount],
              ['발송 요청', item.sentCount],
              ['도달 회원', item.deliveredMembers],
              ['도달 기기', item.deliveredDevices],
              ['실패 기기', item.failedDevices],
            ].map(([label, value], i) => (
              <li key={label}>
                <Card>
                  <p className="text-sm text-muted-foreground">
                    {i + 1}. {label}
                  </p>
                  <p className="mt-3 font-mono text-2xl">
                    {value === null
                      ? '집계 전'
                      : Number(value).toLocaleString()}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            발송 요청 수는 실제 도달 수가 아닙니다. 도달 회원과 기기는 발송 결과
            보고를 집계한 값입니다.
          </p>
          {item.status === 'SCHEDULED' || item.status === 'FAILED' ? (
            <Card className="mt-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  m.setError('');
                  setAction(item.status === 'SCHEDULED' ? 'cancel' : 'retry');
                }}
                className="grid gap-4">
                <label className="grid gap-2 text-sm">
                  처리 사유
                  <input
                    className="control"
                    required
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {item.status === 'FAILED' ? (
                  <p className="text-sm text-muted-foreground">
                    재실행은 예약 상태로 돌아갑니다. 로컬 발송 모드에서는 이미
                    받은 회원에게 다시 갈 수 있습니다.
                  </p>
                ) : null}
                <Button type="submit" disabled={m.pending}>
                  {item.status === 'SCHEDULED' ? '예약 취소' : '재실행'}
                </Button>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction('');
        }}
        title={
          action === 'cancel'
            ? '예약을 취소할까요?'
            : '실패한 캠페인을 재실행할까요?'
        }
        description="현재 상태를 확인한 뒤 처리합니다."
        pending={m.pending}
        error={m.error}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
