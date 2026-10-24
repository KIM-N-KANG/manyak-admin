'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { PageHeading, QueryState, TextLink } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { FormSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import { noticeTagHelp, noticeTags } from '@/features/notices/tags';
import type { Notice } from '@/features/notices/types';
import { useApi } from '@/features/shared/use-api';

export function NoticeFormScreen({ id }: { id?: string }) {
  return id ? <EditNotice id={id} /> : <NoticeForm />;
}

function EditNotice({ id }: { id: string }) {
  const q = useApi<Notice>(`/api/notices/${id}`);

  return (
    <>
      <QueryState
        skeleton={<FormSkeleton />}
        pending={q.isPending}
        error={q.error}
        retry={q.refetch}
      />
      {q.data ? <NoticeForm key={id} notice={q.data} /> : null}
    </>
  );
}

function NoticeForm({ notice }: { notice?: Notice }) {
  const mutation = useManagementMutation();
  const router = useRouter();
  const [saved, setSaved] = useState<Notice | undefined>(notice);

  const [tag, setTag] = useState(notice?.tag ?? '');

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
      <PageHeading title={notice ? '공지 수정' : '새 공지'}>
        <TextLink href={notice ? `/notices/${notice.noticeId}` : '/notices'}>
          돌아가기
        </TextLink>
      </PageHeading>
      <Card>
        <p className="mb-5 text-sm">
          현재 상태: {notice?.status === 'PUBLISHED' ? '게시' : '초안'}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(new FormData(event.currentTarget));
          }}
          className="grid max-w-3xl gap-5">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm">
              <span className="inline-flex items-center gap-1">
                태그
                <HelpTooltip label="공지 태그 도움말">
                  {noticeTagHelp}
                </HelpTooltip>
              </span>
            </legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {noticeTags.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tag"
                    value={option.value}
                    required
                    checked={tag === option.value}
                    onChange={() => setTag(option.value)}
                    className="accent-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
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
              defaultValue={notice?.body ?? ''}
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
          <Button type="submit" disabled={!tag || mutation.pending}>
            {mutation.pending ? '저장 중…' : '저장'}
          </Button>
        </form>
      </Card>
    </>
  );
}
