'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PageHeading, QueryState, TextLink } from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import type { Notice } from '@/features/notices/types';
import { useApi } from '@/features/shared/use-api';

export function NoticeFormScreen({ id }: { id?: string }) {
  return id ? <EditNotice id={id} /> : <NoticeForm />;
}

function EditNotice({ id }: { id: string }) {
  const q = useApi<Notice>(`/api/notices/${id}`);

  return (
    <>
      <QueryState pending={q.isPending} error={q.error} retry={q.refetch} />
      {q.data ? <NoticeForm key={id} notice={q.data} /> : null}
    </>
  );
}

function NoticeForm({ notice }: { notice?: Notice }) {
  const mutation = useManagementMutation();
  const router = useRouter();
  const [saved, setSaved] = useState<Notice | undefined>(notice);

  async function save(form: FormData) {
    const result = await mutation.run<Notice>(
      saved ? `/api/notices/${saved.noticeId}` : '/api/notices',
      saved ? 'PATCH' : 'POST',
      Object.fromEntries(form),
    );

    if (result) {
      setSaved(result);
      router.push(`/notices/${result.noticeId}`);
    }
  }

  return (
    <>
      <PageHeading
        title={notice ? '공지 수정' : '새 공지'}
        description="저장 후 상세 화면에서 알림 여부를 선택하고 게시하세요.">
        <TextLink href={notice ? `/notices/${notice.noticeId}` : '/notices'}>
          돌아가기
        </TextLink>
      </PageHeading>
      <Card>
        <p className="mb-5 text-sm">
          현재 상태: {notice?.status === 'PUBLISHED' ? '게시' : '초안'}
        </p>
        <form action={save} className="grid max-w-3xl gap-5">
          <label className="grid gap-2 text-sm">
            제목
            <input
              className="control"
              name="title"
              required
              maxLength={100}
              defaultValue={notice?.title}
            />
          </label>
          <label className="grid gap-2 text-sm">
            본문
            <textarea
              className="control min-h-64"
              name="body"
              required
              maxLength={5000}
              defaultValue={notice?.body}
            />
          </label>
          <label className="grid gap-2 text-sm">
            변경 사유
            <input className="control" name="reason" required maxLength={500} />
          </label>
          {mutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error}
            </p>
          ) : null}
          <Button type="submit" disabled={mutation.pending}>
            {mutation.pending ? '저장 중…' : '저장'}
          </Button>
        </form>
      </Card>
    </>
  );
}
