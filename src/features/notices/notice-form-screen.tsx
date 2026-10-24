'use client';

import { useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import { PageHeading, QueryState, TextLink } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { FormSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import {
  notificationTextHelp,
  notificationTextLocked,
} from '@/features/notices/notification-text';
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
  const [notificationTitle, setNotificationTitle] = useState(
    notice?.notificationTitle ?? '',
  );
  const [notificationBody, setNotificationBody] = useState(
    notice?.notificationBody ?? '',
  );
  const fieldId = useId();
  const locked = Boolean(notice?.notifiedAt);
  const invalidNotification =
    !locked && (!notificationTitle.trim() || !notificationBody.trim());

  async function save(form: FormData) {
    const payload = Object.fromEntries(form);

    if (saved) {
      for (const key of [
        'title',
        'body',
        'tag',
        'notificationTitle',
        'notificationBody',
      ] as const) {
        if (
          (locked &&
            (key === 'notificationTitle' || key === 'notificationBody')) ||
          payload[key] === saved[key]
        )
          delete payload[key];
      }
    }

    const result = await mutation.run<Notice>(
      saved ? `/api/notices/${saved.noticeId}` : '/api/notices',
      saved ? 'PATCH' : 'POST',
      payload,
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
          <fieldset className="grid gap-5 border-t pt-5">
            <legend className="mb-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-1">
                알림
                <HelpTooltip label="공지 알림 문구 도움말">
                  {notificationTextHelp}
                </HelpTooltip>
              </span>
            </legend>
            <div className="grid gap-2 text-sm">
              <label htmlFor={`${fieldId}-title`}>알림 제목</label>
              <input
                id={`${fieldId}-title`}
                name="notificationTitle"
                className="control"
                placeholder="예: 새로운 점검 안내가 도착했어요"
                required={!locked}
                readOnly={locked}
                maxLength={100}
                value={notificationTitle}
                onChange={(event) =>
                  setNotificationTitle(event.target.value.slice(0, 100))
                }
                aria-describedby={`${fieldId}-title-count${locked ? ` ${fieldId}-lock` : ''}`}
              />
              <p
                id={`${fieldId}-title-count`}
                className="text-right text-xs text-muted-foreground">
                {notificationTitle.length}/100
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <label htmlFor={`${fieldId}-body`}>알림 본문</label>
              <textarea
                id={`${fieldId}-body`}
                name="notificationBody"
                className="control min-h-28"
                required={!locked}
                readOnly={locked}
                maxLength={300}
                value={notificationBody}
                onChange={(event) =>
                  setNotificationBody(event.target.value.slice(0, 300))
                }
                aria-describedby={`${fieldId}-body-count${locked ? ` ${fieldId}-lock` : ''}`}
              />
              <p
                id={`${fieldId}-body-count`}
                className="text-right text-xs text-muted-foreground">
                {notificationBody.length}/300
              </p>
            </div>
            {locked ? (
              <p
                id={`${fieldId}-lock`}
                className="text-sm text-muted-foreground">
                {notificationTextLocked}
              </p>
            ) : null}
          </fieldset>
          <label className="grid gap-2 text-sm">
            변경 사유
            <input className="control" name="reason" required maxLength={500} />
          </label>
          {mutation.error ? (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={!tag || invalidNotification || mutation.pending}>
            {mutation.pending ? '저장 중…' : '저장'}
          </Button>
        </form>
      </Card>
    </>
  );
}
