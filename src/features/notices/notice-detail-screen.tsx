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
import { DetailSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import { NoticeTagBadge } from '@/features/notices/notice-tag-badge';
import { noticePublishConfirmation } from '@/features/notices/tags';
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
        { reason },
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
        skeleton={<DetailSkeleton />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {item ? (
        <>
          <Card>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <NoticeTagBadge tag={item.tag} />
            </div>
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
          action === 'publish' && item
            ? noticePublishConfirmation(item.tag)
            : action === 'delete'
              ? '삭제한 초안은 복구할 수 없습니다.'
              : '게시를 해제하면 사용자에게 보이지 않습니다.'
        }
        pending={mutation.pending}
        error={mutation.error}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
