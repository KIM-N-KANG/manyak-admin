'use client';

import { useState } from 'react';

import {
  DataTable,
  dateTime,
  PageHeading,
  QueryState,
} from '@/components/admin/data-ui';
import { FormSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementMutation } from '@/features/management/mutation';
import type { Template, TemplateKey } from '@/features/notifications/types';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import { useApi } from '@/features/shared/use-api';

const templateOptions = {
  attendance_reminder: {
    label: '출석 리마인드',
    heading: '출석 알림',
    kind: '광고성',
  },
  credit_expiry_reminder: {
    label: '이프 만료 예정 안내',
    heading: '이프 만료 예정 안내',
    kind: '정보성',
  },
};

export function TemplateScreen() {
  const [selected, setSelected] = useState<TemplateKey>('attendance_reminder');
  const url = `/api/notifications/templates/${selected}`;
  const q = useApi<Template>(url);

  return (
    <>
      <PageHeading title="문구 템플릿" />
      <label className="mb-6 grid max-w-md gap-2 text-sm">
        알림 템플릿
        <select
          className="control"
          value={selected}
          onChange={(event) => setSelected(event.target.value as TemplateKey)}>
          {Object.entries(templateOptions).map(([key, option]) => (
            <option key={key} value={key}>
              {option.label} ({option.kind})
            </option>
          ))}
        </select>
      </label>
      <QueryState
        skeleton={<FormSkeleton />}
        pending={q.isPending}
        error={q.error}
        retry={q.refetch}
      />
      {q.data ? (
        <TemplateEditor
          key={selected}
          template={q.data}
          templateKey={selected}
          url={url}
        />
      ) : null}
    </>
  );
}

function TemplateEditor({
  template,
  templateKey,
  url,
}: {
  template: Template;
  templateKey: TemplateKey;
  url: string;
}) {
  const option = templateOptions[templateKey];
  const marketing = templateKey === 'attendance_reminder';
  const previewTitle =
    marketing && !template.effective.title.startsWith('(광고)')
      ? `(광고) ${template.effective.title}`
      : template.effective.title;
  const m = useManagementMutation();
  const [draft, setDraft] = useState<{
    method: string;
    body: Record<string, unknown>;
  } | null>(null);
  const [error, setError] = useState('');

  function prepare(form: FormData) {
    const from = String(form.get('effectiveFrom') ?? '');
    const until = String(form.get('effectiveUntil') ?? '');

    if (
      (from && Date.parse(from) <= Date.now()) ||
      (until && Date.parse(until) <= (from ? Date.parse(from) : Date.now()))
    ) {
      setError('시작 시각은 현재 이후, 종료 시각은 시작 이후로 지정하세요.');

      return;
    }

    setError('');
    m.setError('');
    setDraft({
      method: 'PUT',
      body: {
        title: form.get('title'),
        body: form.get('body'),
        reason: form.get('reason'),
        ...(from ? { effectiveFrom: new Date(from).toISOString() } : {}),
        ...(until ? { effectiveUntil: new Date(until).toISOString() } : {}),
      },
    });
  }

  async function confirm() {
    if (draft && (await m.run<Template>(url, draft.method, draft.body)))
      setDraft(null);
  }

  return (
    <>
      <Card>
        <h2 className="text-xl font-semibold">{option.heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {templateKey} · {option.kind} ·{' '}
          {template.effective.isDefault ? '기본 문구' : '변경 문구'}
        </p>
        {!marketing ? (
          <p className="mt-4 rounded-md border bg-muted p-3 text-sm">
            금액·수량·만료 시각을 넣지 마세요. 충전이나 이용을 권하는 문구가
            포함되면 광고성 알림으로 분류됩니다.
          </p>
        ) : null}
        <h3 className="mt-6 font-semibold">{previewTitle}</h3>
        <p className="mt-3 text-sm whitespace-pre-wrap">
          {template.effective.body}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          발송기는 문구 스냅샷 갱신 주기 안에 변경 내용을 반영합니다.
        </p>
      </Card>
      <Card className="mt-6">
        <h2 className="mb-5 text-lg font-semibold">문구 변경</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            prepare(new FormData(event.currentTarget));
          }}
          className="grid max-w-3xl gap-5">
          <label className="grid gap-2 text-sm">
            {marketing ? '제목 (광고 표기 없이)' : '제목'}
            <input
              className="control"
              name="title"
              required
              maxLength={100}
              defaultValue={template.effective.title}
            />
          </label>
          <label className="grid gap-2 text-sm">
            본문
            <textarea
              className="control min-h-28"
              name="body"
              required
              maxLength={300}
              defaultValue={template.effective.body}
            />
          </label>
          <label className="grid gap-2 text-sm">
            시작 시각 (비우면 즉시, 현재 기기 시간대)
            <input
              className="control"
              name="effectiveFrom"
              type="datetime-local"
            />
          </label>
          <label className="grid gap-2 text-sm">
            종료 시각 (비우면 상시)
            <input
              className="control"
              name="effectiveUntil"
              type="datetime-local"
            />
          </label>
          <label className="grid gap-2 text-sm">
            변경 사유
            <input className="control" name="reason" maxLength={500} required />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={m.pending}>
            문구 변경
          </Button>
        </form>
      </Card>
      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">기본 문구 복귀</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();

            const form = new FormData(event.currentTarget);

            m.setError('');
            setDraft({
              method: 'DELETE',
              body: { reason: form.get('reason') },
            });
          }}
          className="grid max-w-3xl gap-4">
          <p className="text-sm text-muted-foreground">
            현재 문구와 앞으로 시작할 예약 문구를 모두 종료합니다. 변경 이력은
            남습니다.
          </p>
          <label className="grid gap-2 text-sm">
            복귀 사유
            <input className="control" name="reason" maxLength={500} required />
          </label>
          <Button type="submit" variant="outline" disabled={m.pending}>
            기본 문구로 복귀
          </Button>
        </form>
      </Card>
      <h2 className="mt-8 mb-4 text-lg font-semibold">변경 이력</h2>
      <DataTable
        headers={['제목', '본문', '시작 시각', '종료 시각', '적용 상태']}
        empty={!template.overrides.length}>
        {template.overrides.map((i, n) => (
          <tr key={`${i.effectiveFrom}-${n}`}>
            <td>{i.title}</td>
            <td className="max-w-sm truncate">{i.body}</td>
            <td>{dateTime(i.effectiveFrom)}</td>
            <td>{i.effectiveUntil ? dateTime(i.effectiveUntil) : '상시'}</td>
            <td>{i.active ? '현재 유효' : '대기 또는 종료'}</td>
          </tr>
        ))}
      </DataTable>
      <ConfirmDialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title={
          draft?.method === 'DELETE'
            ? '기본 문구로 복귀할까요?'
            : '문구 변경을 적용할까요?'
        }
        description="문구 변경은 이력에 남으며 발송기 갱신 주기에 따라 반영됩니다."
        pending={m.pending}
        error={m.error}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
