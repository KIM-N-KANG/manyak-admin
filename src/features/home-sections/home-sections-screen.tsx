'use client';

import { useRef, useState } from 'react';

import { customInstance, FetchError } from '@/api/mutator/custom-instance';
import { DataTable, PageHeading, QueryState } from '@/components/admin/data-ui';
import { TableSkeleton } from '@/components/admin/loading-ui';
import { ReasonDialog, SuccessNotice } from '@/components/admin/reason-dialog';
import { Button } from '@/components/ui/button';
import { useApi } from '@/features/shared/use-api';

import {
  type HomeSection,
  sectionBody,
  sectionContent,
  type SectionForm,
  sectionMessages,
} from './form';
import { sectionMoveUpdates } from './move';
import { type FieldError, SectionEditor } from './section-editor';
import { SectionSwitch } from './section-switch';

const endpoint = '/api/home-sections';

type Action =
  | { kind: 'edit'; section?: HomeSection }
  | { kind: 'toggle'; section: HomeSection }
  | { kind: 'delete'; section: HomeSection }
  | { kind: 'move'; section: HomeSection; neighbor: HomeSection };

export function HomeSectionsScreen() {
  const query = useApi<{ items: HomeSection[] }>(endpoint);
  const rows = query.data?.items ?? [];
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState({
    message: '',
    version: 0,
    error: false,
  });
  const trigger = useRef<HTMLElement | null>(null);
  const locked = useRef(false);

  function open(value: Action, element: HTMLElement) {
    trigger.current = element;
    setReason('');
    setError('');
    setFields([]);
    setAction(value);
  }

  function close() {
    if (!locked.current) setAction(null);
  }

  function notify(message: string, error = false) {
    setNotice((current) => ({ message, error, version: current.version + 1 }));
  }

  async function confirm(form?: SectionForm, editReason?: string) {
    if (!action || locked.current) return;

    locked.current = true;
    setPending(true);
    setError('');
    setFields([]);

    const value = editReason ?? reason;
    const url = action.section
      ? `${endpoint}/${encodeURIComponent(action.section.id)}`
      : endpoint;
    let firstSaved = false;

    try {
      if (action.kind === 'edit') {
        if (!form) return;

        await customInstance(url, {
          method: action.section ? 'PATCH' : 'POST',
          body: JSON.stringify(sectionBody(form, value, action.section)),
        });
      } else if (action.kind === 'delete') {
        await customInstance(url, {
          method: 'DELETE',
          body: JSON.stringify({ reason: value.trim() }),
        });
      } else if (action.kind === 'toggle') {
        await customInstance(url, {
          method: 'PATCH',
          body: JSON.stringify({
            isActive: !action.section.isActive,
            reason: value.trim(),
          }),
        });
      } else {
        for (const update of sectionMoveUpdates(
          rows,
          action.section,
          action.neighbor,
        )) {
          await customInstance(`${endpoint}/${encodeURIComponent(update.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              sortOrder: update.sortOrder,
              reason: value.trim(),
            }),
          });
          firstSaved = true;
        }
      }

      setAction(null);
      setReason('');
      notify(
        action.kind === 'delete'
          ? sectionMessages.deleted
          : sectionMessages.saved,
      );
      await query.refetch();
    } catch (failure) {
      if (firstSaved) {
        setAction(null);
        setReason('');
        await query.refetch();
        notify(sectionMessages.partial, true);
      } else if (failure instanceof FetchError && failure.status === 404) {
        setAction(null);
        setReason('');
        notify('홈 섹션을 찾을 수 없습니다. 목록을 새로 불러왔습니다.', true);
        await query.refetch();
      } else {
        const data =
          failure instanceof FetchError
            ? (failure.data as { message?: unknown; details?: unknown } | null)
            : null;

        setError(
          typeof data?.message === 'string'
            ? data.message
            : '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );

        if (
          failure instanceof FetchError &&
          failure.status === 400 &&
          Array.isArray(data?.details)
        ) {
          setFields(
            data.details.filter((item): item is FieldError =>
              Boolean(
                item &&
                typeof item.field === 'string' &&
                typeof item.message === 'string',
              ),
            ),
          );
        }
      }
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <PageHeading title="홈 섹션">
        <Button
          disabled={pending}
          onClick={(event) => open({ kind: 'edit' }, event.currentTarget)}>
          등록
        </Button>
      </PageHeading>
      {notice.message ? (
        <>
          {notice.error ? (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {notice.message}
            </p>
          ) : (
            <SuccessNotice key={notice.version} message={notice.message} />
          )}
        </>
      ) : null}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
        skeleton={<TableSkeleton columns={7} />}
      />
      {query.data ? (
        <>
          {rows.length === 0 ? (
            <div className="rounded-md border bg-card p-10 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                {sectionMessages.empty}
              </p>
              <Button
                disabled={pending}
                onClick={(event) =>
                  open({ kind: 'edit' }, event.currentTarget)
                }>
                홈 섹션 등록
              </Button>
            </div>
          ) : (
            <>
              {rows.every((section) => !section.isActive) ? (
                <p
                  role="status"
                  className="mb-4 rounded-md border bg-muted p-4 text-sm">
                  {sectionMessages.fallback}
                </p>
              ) : null}
              <DataTable
                headers={[
                  '순서',
                  '이름',
                  '출처',
                  '내용',
                  '개수',
                  '활성',
                  '관리',
                ]}>
                {rows.map((section, index) => (
                  <tr key={section.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums">
                          {section.sortOrder}
                        </span>
                        <Button
                          variant="outline"
                          disabled={pending || index === 0}
                          aria-label={`${section.name} 위로`}
                          onClick={(event) =>
                            open(
                              {
                                kind: 'move',
                                section,
                                neighbor: rows[index - 1],
                              },
                              event.currentTarget,
                            )
                          }>
                          위로
                        </Button>
                        <Button
                          variant="outline"
                          disabled={pending || index === rows.length - 1}
                          aria-label={`${section.name} 아래로`}
                          onClick={(event) =>
                            open(
                              {
                                kind: 'move',
                                section,
                                neighbor: rows[index + 1],
                              },
                              event.currentTarget,
                            )
                          }>
                          아래로
                        </Button>
                      </div>
                    </td>
                    <td>{section.name}</td>
                    <td>
                      {section.source === 'MANUAL' ? '직접 고름' : '조건'}
                    </td>
                    <td>{sectionContent(section)}</td>
                    <td>{section.itemLimit}</td>
                    <td>
                      <SectionSwitch
                        label={`${section.name} 활성`}
                        checked={section.isActive}
                        disabled={pending}
                        onChange={(event) =>
                          open({ kind: 'toggle', section }, event.currentTarget)
                        }
                      />
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={pending}
                          aria-label={`${section.name} 수정`}
                          onClick={(event) =>
                            open({ kind: 'edit', section }, event.currentTarget)
                          }>
                          수정
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={pending}
                          aria-label={`${section.name} 삭제`}
                          onClick={(event) =>
                            open(
                              { kind: 'delete', section },
                              event.currentTarget,
                            )
                          }>
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </>
          )}
        </>
      ) : null}
      {action?.kind === 'edit' ? (
        <SectionEditor
          section={action.section}
          pending={pending}
          error={error}
          fields={fields}
          finalFocus={trigger}
          onClose={close}
          onSave={(form, value) => void confirm(form, value)}
        />
      ) : null}
      <ReasonDialog
        open={action !== null && action.kind !== 'edit'}
        title={
          action?.kind === 'delete'
            ? '홈 섹션 삭제'
            : action?.kind === 'move'
              ? '홈 섹션 순서 이동'
              : '홈 섹션 활성 전환'
        }
        description={
          action?.kind === 'delete'
            ? sectionMessages.delete
            : action?.section?.name
        }
        reason={reason}
        onReasonChange={setReason}
        pending={pending}
        error={error}
        finalFocus={trigger}
        onClose={close}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
