'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

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
import type { Notice } from '@/features/notices/types';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import { useApi } from '@/features/shared/use-api';

export function NoticeDetailScreen({ id }: { id: string }) {
  const query = useApi<Notice>(`/api/notices/${id}`);
  const item = query.data;
  const mutation = useManagementMutation();
  const router = useRouter();
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(false);
  const [kind, setKind] = useState('SERVICE');

  async function confirm() {
    if (action === 'delete') {
      const response = await mutation.run<{ deleted: boolean }>(
        `/api/notices/${id}`,
        'DELETE',
        { reason },
      );

      if (response) router.push('/notices');
    } else {
      const result = await mutation.run<Notice>(
        `/api/notices/${id}/${action}`,
        'POST',
        {
          reason,
          ...(action === 'publish' ? { notify, notificationKind: kind } : {}),
        },
      );

      if (result) setAction('');
    }
  }

  return (
    <>
      <PageHeading title="공지 상세">
        <TextLink href="/notices">목록으로</TextLink>
      </PageHeading>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {item ? (
        <>
          <Card>
            <h2 className="mb-6 text-xl font-semibold">{item.title}</h2>
            <DetailGrid
              items={[
                ['상태', item.status === 'PUBLISHED' ? '게시' : '초안'],
                ['작성자', item.createdBy.nickname],
                [
                  '게시 시각',
                  item.publishedAt ? dateTime(item.publishedAt) : '—',
                ],
                [
                  '알림 요청 시각',
                  item.notifiedAt ? dateTime(item.notifiedAt) : '—',
                ],
                ['수정 시각', dateTime(item.updatedAt)],
              ]}
            />
            <p className="mt-8 text-sm leading-7 whitespace-pre-wrap">
              {item.body}
            </p>
            <div className="mt-6">
              <TextLink href={`/notices/${id}/edit`}>내용 수정</TextLink>
            </div>
          </Card>
          <Card className="mt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.setError('');
                setAction(
                  item.status === 'PUBLISHED' ? 'unpublish' : 'publish',
                );
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
              {item.status === 'DRAFT' ? (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={notify}
                      disabled={!!item.notifiedAt}
                      onChange={(e) => setNotify(e.target.checked)}
                    />
                    게시할 때 알림 보내기
                  </label>
                  {item.notifiedAt ? (
                    <p className="text-sm text-muted-foreground">
                      이미 알림을 요청한 공지는 다시 알리지 않습니다.
                    </p>
                  ) : null}
                  {notify ? (
                    <>
                      <label className="grid gap-2 text-sm">
                        알림 성격
                        <select
                          className="control"
                          value={kind}
                          onChange={(e) => setKind(e.target.value)}>
                          <option value="SERVICE">정보성</option>
                          <option value="MARKETING">광고성</option>
                        </select>
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {kind === 'SERVICE'
                          ? '정보성은 서비스 알림 동의자에게 야간 제한 없이 발송합니다.'
                          : '광고성 알림은 광고 수신에 동의한 회원만 대상이며 캠페인 경로로 발송합니다. 제목에 (광고) 표시와 수신 거부 안내가 추가되며, KST 21:00~08:00에는 야간 광고 수신 동의자만 대상입니다. 정보성은 서비스 알림 동의자에게 야간 제한 없이 발송합니다.'}
                      </p>
                    </>
                  ) : null}
                </>
              ) : null}
              <div className="flex gap-3">
                <Button type="submit" disabled={mutation.pending}>
                  {item.status === 'PUBLISHED' ? '게시 해제' : '게시'}
                </Button>
                {item.status === 'DRAFT' && !item.notifiedAt ? (
                  <Button
                    variant="outline"
                    type="button"
                    disabled={!reason.trim() || mutation.pending}
                    onClick={() => {
                      mutation.setError('');
                      setAction('delete');
                    }}>
                    초안 삭제
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
        </>
      ) : null}
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction('');
        }}
        title={
          action === 'publish'
            ? '공지를 게시할까요?'
            : action === 'delete'
              ? '초안을 삭제할까요?'
              : '게시를 해제할까요?'
        }
        description={
          action === 'publish' && notify
            ? kind === 'SERVICE'
              ? '정보성 알림을 서비스 알림 동의자에게 야간 제한 없이 발송하도록 요청합니다. 게시 후 알림 요청은 되돌릴 수 없습니다.'
              : '광고성 알림은 광고 수신에 동의한 회원만 대상입니다. KST 21:00~08:00에는 야간 광고 수신 동의자에게만 발송합니다. 게시 후 알림 요청은 되돌릴 수 없습니다.'
            : '선택한 작업을 고정 데이터에 반영합니다.'
        }
        pending={mutation.pending}
        error={mutation.error}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
