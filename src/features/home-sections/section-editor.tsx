'use client';

import {
  type RefObject,
  useDeferredValue,
  useId,
  useRef,
  useState,
} from 'react';

import { Dialog } from '@base-ui/react/dialog';

import { QueryState } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { reasonSchema } from '@/components/admin/reason-dialog';
import { Button } from '@/components/ui/button';
import { useApi } from '@/features/shared/use-api';
import type { Story } from '@/features/stories/types';
import { cn } from '@/lib/utils';

import {
  type HomeSection,
  initialForm,
  type SectionForm,
  sectionFormSchema,
  sectionMessages,
  sortLabels,
} from './form';
import { SectionSwitch } from './section-switch';

export interface FieldError {
  field: string;
  message: string;
}
export function SectionEditor({
  section,
  pending,
  error,
  fields,
  finalFocus,
  onClose,
  onSave,
}: {
  section?: HomeSection;
  pending: boolean;
  error: string;
  fields: FieldError[];
  finalFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSave: (form: SectionForm, reason: string) => void;
}) {
  const [form, setForm] = useState(() => initialForm(section));
  const [reason, setReason] = useState('');
  const [genre, setGenre] = useState('');
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const results = useApi<{ items: Story[] }>(
    `/api/stories?page=1&size=20&order=desc&q=${encodeURIComponent(q)}`,
    form.source === 'MANUAL' && q.length > 0,
  );
  const input = useRef<HTMLInputElement | null>(null);
  const errorId = useId();
  const valid =
    sectionFormSchema.safeParse(form).success &&
    reasonSchema.safeParse(reason).success;

  function update<K extends keyof SectionForm>(key: K, value: SectionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function move(index: number, offset: number) {
    const stories = [...form.stories];

    [stories[index], stories[index + offset]] = [
      stories[index + offset],
      stories[index],
    ];
    update('stories', stories);
  }

  function addGenre() {
    const value = genre.trim();

    if (!value || form.genres.length >= 10 || form.genres.includes(value))
      return;

    update('genres', [...form.genres, value]);
    setGenre('');
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(open, details) => {
        if (pending) details.cancel();
        else if (!open) onClose();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup
          initialFocus={input}
          finalFocus={finalFocus}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-3rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border bg-card p-6 shadow-lg">
          <Dialog.Title className="text-xl font-semibold">
            홈 섹션 {section ? '수정' : '등록'}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            홈 섹션의 이름과 출처를 설정하고 처리 사유를 입력해 주세요.
          </Dialog.Description>
          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (valid && !pending) onSave(form, reason);
            }}>
            <fieldset disabled={pending} className="mt-5 space-y-5">
              <label className="flex flex-col gap-2 text-sm">
                이름
                <input
                  ref={input}
                  className="control"
                  value={form.name}
                  maxLength={30}
                  required
                  aria-invalid={fields.some((item) => item.field === 'name')}
                  onChange={(event) => update('name', event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                출처
                <select
                  className="control"
                  value={form.source}
                  onChange={(event) =>
                    update(
                      'source',
                      event.target.value as SectionForm['source'],
                    )
                  }>
                  <option value="FILTER">조건</option>
                  <option value="MANUAL">직접 고름</option>
                </select>
              </label>
              {form.source === 'MANUAL' ? (
                <section aria-label="스토리 선택" className="space-y-3">
                  <label className="flex flex-col gap-2 text-sm">
                    스토리 검색
                    <input
                      className="control"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  {q ? (
                    <>
                      <QueryState
                        pending={results.isPending}
                        error={results.error}
                        retry={results.refetch}
                        variant="inline"
                      />
                      {results.data ? (
                        <ul
                          aria-label="검색 결과"
                          className="max-h-48 overflow-y-auto rounded-sm border p-2">
                          {results.data.items.map((story) => (
                            <li
                              key={story.storyId}
                              className="flex items-center justify-between gap-2 py-1 text-sm">
                              <span className="min-w-0 break-words">
                                {story.title}
                              </span>
                              <Button
                                variant="outline"
                                type="button"
                                disabled={
                                  form.stories.length >= 20 ||
                                  form.stories.some(
                                    (item) => item.storyId === story.storyId,
                                  )
                                }
                                aria-label={`${story.title} 추가`}
                                onClick={() =>
                                  update('stories', [
                                    ...form.stories,
                                    {
                                      storyId: story.storyId,
                                      title: story.title,
                                      isListed:
                                        story.visibility === 'PUBLIC' &&
                                        !story.deletedAt &&
                                        !story.takenDownAt,
                                    },
                                  ])
                                }>
                                추가
                              </Button>
                            </li>
                          ))}
                          {results.data.items.length === 0 ? (
                            <li className="p-2 text-sm text-muted-foreground">
                              검색 결과가 없습니다.
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </>
                  ) : null}
                  <ol aria-label="선택한 스토리" className="space-y-2">
                    {form.stories.map((story, index) => (
                      <li
                        key={story.storyId}
                        className="flex flex-wrap items-center gap-2 rounded-sm border p-2 text-sm">
                        <span className="min-w-0 flex-1 break-words">
                          {index + 1}. {story.title}
                        </span>
                        {!story.isListed ? (
                          <>
                            <span className="rounded-sm border bg-muted px-2 py-1 text-xs">
                              노출 안 됨
                            </span>
                            <HelpTooltip label={`${story.title} 노출 안내`}>
                              {sectionMessages.unlisted}
                            </HelpTooltip>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          disabled={index === 0}
                          aria-label={`${story.title} 위로`}
                          onClick={() => move(index, -1)}>
                          위로
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={index === form.stories.length - 1}
                          aria-label={`${story.title} 아래로`}
                          onClick={() => move(index, 1)}>
                          아래로
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label={`${story.title} 빼기`}
                          onClick={() =>
                            update(
                              'stories',
                              form.stories.filter(
                                (item) => item.storyId !== story.storyId,
                              ),
                            )
                          }>
                          빼기
                        </Button>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    {form.stories.length}/20개
                  </p>
                </section>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    <label className="flex flex-col gap-2">
                      장르
                      <input
                        className="control"
                        value={genre}
                        onChange={(event) => setGenre(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addGenre();
                          }
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addGenre}
                      disabled={
                        !genre.trim() ||
                        form.genres.length >= 10 ||
                        form.genres.includes(genre.trim())
                      }>
                      장르 추가
                    </Button>
                    <ul
                      aria-label="선택한 장르"
                      className="flex flex-wrap gap-2">
                      {form.genres.map((item, index) => {
                        const failure = fields.find(
                          (field) => field.field === `genres[${index}]`,
                        );

                        return (
                          <li
                            key={item}
                            className={cn(
                              'flex items-center gap-1 rounded-sm border px-2 py-1 text-xs',
                              failure && 'border-destructive text-destructive',
                            )}>
                            <span aria-invalid={Boolean(failure)}>
                              {item}
                              {failure ? `: ${failure.message}` : ''}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-7 px-1"
                              aria-label={`${item} 장르 빼기`}
                              onClick={() =>
                                update(
                                  'genres',
                                  form.genres.filter((value) => value !== item),
                                )
                              }>
                              ×
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                    {form.genres.length === 0 ? (
                      <p className="text-xs text-muted-foreground">전체 장르</p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.originalOnly}
                      onChange={(event) =>
                        update('originalOnly', event.target.checked)
                      }
                    />
                    오리지널만
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    정렬
                    <select
                      className="control"
                      value={form.sort}
                      onChange={(event) =>
                        update(
                          'sort',
                          event.target.value as SectionForm['sort'],
                        )
                      }>
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="flex flex-col gap-2 text-sm">
                개수
                <input
                  className="control"
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={Number.isNaN(form.itemLimit) ? '' : form.itemLimit}
                  onChange={(event) =>
                    update('itemLimit', event.target.valueAsNumber)
                  }
                />
              </label>
              <div className="flex items-center gap-2 text-sm">
                <SectionSwitch
                  label="활성"
                  checked={form.isActive}
                  onChange={(event) => update('isActive', event.target.checked)}
                />
                <span>활성</span>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                처리 사유
                <textarea
                  className="control min-h-24"
                  maxLength={500}
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            </fieldset>
            {error ? (
              <div
                id={errorId}
                role="alert"
                className="mt-3 text-sm text-destructive">
                <p>{error}</p>
                {fields
                  .filter((field) => !/^genres\[\d+\]$/.test(field.field))
                  .map((field, index) => (
                    <p key={index}>
                      {field.field}: {field.message}
                    </p>
                  ))}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={pending || !valid}>
                {pending ? '처리 중…' : '확인'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
