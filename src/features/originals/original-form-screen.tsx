'use client';

import { type FormEvent, useId, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { customInstance } from '@/api/mutator/custom-instance';
import { PageHeading, QueryState, TextLink } from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import {
  emptyOriginal,
  originalDraftSchema,
  originalPublishSchema,
} from '@/features/originals/form-schema';
import {
  originalFormValues,
  originalRequestFields,
} from '@/features/originals/form-values';
import { ImageUpload } from '@/features/originals/image-upload';
import type {
  OriginalCatalog,
  OriginalDetail,
  OriginalPayload,
  OriginalSaveRequest,
} from '@/features/originals/types';
import { useApi } from '@/features/shared/use-api';

function nextImageName(name: string, existing: string[]) {
  let number = 1;

  while (existing.includes(`${name}_이미지${number}`)) number++;

  return `${name}_이미지${number}`;
}

function OriginalEditor({
  id,
  initial,
  thumbnailUrl,
  initialStatus = 'DRAFT',
  initialVisibility = 'PRIVATE',
}: {
  id?: string;
  initial: OriginalPayload;
  thumbnailUrl?: string | null;
  initialStatus?: 'DRAFT' | 'PUBLISHED';
  initialVisibility?: 'PUBLIC' | 'PRIVATE';
}) {
  const router = useRouter();
  const client = useQueryClient();
  const prefix = useId();
  const [recordId, setRecordId] = useState(id);
  const [reason, setReason] = useState('');
  const [payload, setPayload] = useState<OriginalPayload>(() =>
    structuredClone(initial),
  );
  const [cover, setCover] = useState<string | null>(() =>
    initial.removeThumbnail
      ? null
      : initial.thumbnailObjectKey
        ? `/api/originals/images/${initial.thumbnailObjectKey.split('/').at(-1)!.split('.')[0]}`
        : (thumbnailUrl ?? null),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploads, setUploads] = useState(0);
  const catalog = useApi<OriginalCatalog>('/api/originals/catalog');
  const busy = pending || uploads > 0;
  const onUploadPending = (value: boolean) =>
    setUploads((count) => count + (value ? 1 : -1));

  function update(path: string, value: unknown) {
    setPayload((current) => {
      const next = structuredClone(current);
      const keys = path.split('.');
      let target = next as unknown as Record<string, unknown>;

      for (const key of keys.slice(0, -1))
        target = target[key] as Record<string, unknown>;

      target[keys.at(-1)!] = value;

      const match = /^characters\.(\d+)\.name$/.exec(path);

      if (match) {
        const character = next.characters[Number(match[1])];

        character.images.forEach((image) => {
          image.imageName = `${String(value)}_${image.imageName.split('_').at(-1)}`;
        });
      }

      return next;
    });
  }

  function field(
    path: string,
    label: string,
    multiline = false,
    maxLength?: number,
    numeric = false,
  ) {
    const value = path
      .split('.')
      .reduce<unknown>(
        (entry, key) => (entry as Record<string, unknown>)[key],
        payload,
      );
    const props = {
      id: `${prefix}-${path}`,
      name: path,
      value: String(value ?? ''),
      maxLength,
      'aria-invalid': Boolean(errors[path]),
      'aria-describedby': errors[path] ? `${prefix}-${path}-error` : undefined,
      onChange: (event: { target: { value: string } }) =>
        update(path, numeric ? Number(event.target.value) : event.target.value),
      className: 'control w-full',
    };

    return (
      <label
        key={path}
        className="flex min-w-0 flex-col gap-2 text-sm"
        htmlFor={props.id}>
        {label}
        {multiline ? (
          <textarea
            {...props}
            rows={4}
            className="control min-h-28 w-full resize-y py-3"
          />
        ) : (
          <input
            {...props}
            type={numeric ? 'number' : 'text'}
            min={numeric ? 0 : undefined}
            step={numeric ? 1 : undefined}
          />
        )}
        {errors[path] ? (
          <span
            id={`${prefix}-${path}-error`}
            className="text-xs text-destructive">
            {errors[path]}
          </span>
        ) : null}
      </label>
    );
  }

  function validate(status: NonNullable<OriginalSaveRequest['status']>) {
    const result = (
      status === 'PUBLISHED' ? originalPublishSchema : originalDraftSchema
    ).safeParse(payload);

    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            issue.path.join('.'),
            issue.message,
          ]),
        ),
      );

      return null;
    }

    setErrors({});

    return result.data;
  }

  async function save(status: NonNullable<OriginalSaveRequest['status']>) {
    status = initialStatus === 'PUBLISHED' ? 'PUBLISHED' : status;

    if (!reason.trim() || reason.length > 500) {
      setFailure('변경 사유를 1~500자로 입력하세요.');

      return;
    }

    const data = validate(status);

    if (!data || busy) return;

    setPending(true);
    setFailure('');

    try {
      const response = await customInstance<{ data: OriginalDetail }>(
        recordId
          ? `/api/originals/${encodeURIComponent(recordId)}`
          : '/api/originals',
        {
          method: recordId ? 'PATCH' : 'POST',
          body: JSON.stringify({
            ...originalRequestFields(data),
            status,
            visibility:
              status === 'PUBLISHED' &&
              (initialStatus !== 'PUBLISHED' || confirm)
                ? 'PUBLIC'
                : initialVisibility,
            reason,
          }),
        },
      );

      setRecordId(response.data.storyId);

      if (data.removeThumbnail)
        await customInstance(
          `/api/originals/${response.data.storyId}/thumbnail`,
          { method: 'DELETE', body: JSON.stringify({ reason }) },
        );

      await client.invalidateQueries();
      setConfirm(false);
      router.push(`/originals/${response.data.storyId}`);
    } catch {
      setFailure(
        '저장하지 못했습니다. 입력 내용을 유지했으니 다시 시도하세요.',
      );
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void save('DRAFT');
  }

  return (
    <>
      <div className="mb-6">
        <TextLink href={id ? `/originals/${id}` : '/originals'}>
          ← {id ? '오리지널 상세' : '오리지널 목록'}
        </TextLink>
      </div>
      <PageHeading
        title={id ? '오리지널 수정' : '새 오리지널'}
        description="공식 계정 마냑의 콘텐츠입니다. 초안을 저장하거나 필수 항목을 완성해 공개하세요."
      />
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
          <Card className="space-y-5">
            <h2 className="text-lg font-semibold">기본 정보</h2>
            <label className="grid gap-2 text-sm">
              변경 사유
              <input
                className="control"
                name="reason"
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {field('title', '제목 · 필수 (최대 100자)', false, 100)}
            {field(
              'oneLineIntro',
              '한 줄 소개 · 공개 시 필수 (최대 255자)',
              false,
              255,
            )}
            {field('description', '소개 · 주요 내용', true)}
            <div className="space-y-3">
              <label className="flex flex-col gap-2 text-sm">
                장르·태그 · 공개 시 1~8개
                <select
                  className="control"
                  aria-label="장르 선택"
                  aria-invalid={Boolean(errors.genres)}
                  value=""
                  disabled={payload.genres.length >= 8 || catalog.isPending}
                  onChange={(event) => {
                    if (event.target.value)
                      update('genres', [...payload.genres, event.target.value]);
                  }}>
                  <option value="">장르를 선택해 추가하세요</option>
                  {(catalog.data?.genres.map((genre) => genre.name) ?? [])
                    .filter((genre) => !payload.genres.includes(genre))
                    .map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {payload.genres.map((genre) => (
                  <Button
                    key={genre}
                    type="button"
                    variant="outline"
                    onClick={() =>
                      update(
                        'genres',
                        payload.genres.filter((entry) => entry !== genre),
                      )
                    }
                    aria-label={`${genre} 장르 제거`}>
                    {genre} ×
                  </Button>
                ))}
              </div>
              {errors.genres ? (
                <p className="text-xs text-destructive">{errors.genres}</p>
              ) : null}
              {catalog.isError ? (
                <p className="text-sm text-destructive">
                  장르를 불러올 수 없습니다.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void catalog.refetch()}>
                    다시 시도
                  </button>
                </p>
              ) : null}
            </div>
          </Card>
          <Card className="space-y-5">
            <h2 className="text-lg font-semibold">주인공과 스토리 설정</h2>
            {field('protagonistName', '주인공 이름 (최대 30자)', false, 30)}
            <p className="text-xs text-muted-foreground">
              본문에 {'{username}'}을 사용하면 주인공 이름을 입력해야 합니다.
            </p>
            {field(
              'storySettings.userRoleSetting',
              '주인공 소개·역할 · 공개 시 필수',
              true,
            )}
            {field('storySettings.worldSetting', '세계관 · 공개 시 필수', true)}
            {field(
              'storySettings.characterSetting',
              '등장인물 설정 · 공개 시 필수',
              true,
            )}
            {field(
              'storySettings.ruleSetting',
              '전개 규칙 · 공개 시 필수',
              true,
            )}
          </Card>
          <Card>
            <h2 className="mb-5 text-lg font-semibold">표지 이미지</h2>
            <ImageUpload
              storyId={recordId}
              label="표지"
              kind="COVER"
              imageUrl={cover}
              onPendingChange={onUploadPending}
              onUpload={(image) => {
                setCover(image.imageUrl);
                update('thumbnailObjectKey', image.objectKey);
                update('removeThumbnail', false);
              }}
              onRemove={() => {
                setCover(null);
                update('thumbnailObjectKey', undefined);
                update('removeThumbnail', true);
              }}
            />
          </Card>
          <Card className="space-y-5">
            <h2 className="text-lg font-semibold">주변 인물 · 최대 6명</h2>
            {payload.characters.map((character, index) => (
              <div key={index} className="space-y-4 rounded-md border p-5">
                <h3 className="font-semibold">주변 인물 {index + 1}</h3>
                {field(
                  `characters.${index}.name`,
                  '인물 이름 (최대 100자)',
                  false,
                  100,
                )}
                {field(
                  `characters.${index}.description`,
                  '인물 소개 (한 줄, 최대 150자)',
                  false,
                  150,
                )}
                {character.images.map((image, position) => (
                  <div key={position} className="space-y-3">
                    {field(
                      `characters.${index}.images.${position}.imageName`,
                      '이미지 이름 · 인물이름_접미 (접미 1~20자)',
                      false,
                      120,
                    )}
                    <ImageUpload
                      storyId={recordId}
                      label={`${character.name || `인물 ${index + 1}`} 이미지 ${position + 1}`}
                      kind="CHARACTER"
                      imageUrl={image.imageUrl}
                      onPendingChange={onUploadPending}
                      onUpload={(upload) =>
                        update(`characters.${index}.images.${position}`, {
                          objectKey: upload.objectKey,
                          imageUrl: upload.imageUrl,
                          imageName: image.imageName,
                        })
                      }
                      onRemove={() =>
                        update(
                          `characters.${index}.images`,
                          character.images.filter(
                            (_, number) => number !== position,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                {character.images.length < 10 ? (
                  <ImageUpload
                    storyId={recordId}
                    label={`${character.name || `인물 ${index + 1}`} 새 이미지`}
                    kind="CHARACTER"
                    disabled={!character.name.trim()}
                    onPendingChange={onUploadPending}
                    onUpload={(image) =>
                      update(`characters.${index}.images`, [
                        ...character.images,
                        {
                          objectKey: image.objectKey,
                          imageUrl: image.imageUrl,
                          imageName: nextImageName(
                            character.name,
                            character.images.map((entry) => entry.imageName),
                          ),
                        },
                      ])
                    }
                    onRemove={() => undefined}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    update(
                      'characters',
                      payload.characters.filter(
                        (_, number) => number !== index,
                      ),
                    )
                  }>
                  주변 인물 {index + 1} 제거
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={payload.characters.length >= 6}
              onClick={() =>
                update('characters', [
                  ...payload.characters,
                  { name: '', description: '', images: [] },
                ])
              }>
              주변 인물 추가
            </Button>
          </Card>
          <Card className="space-y-5">
            <h2 className="text-lg font-semibold">
              시작 설정 · 공개 시 1개 이상
            </h2>
            {payload.startSettings.map((start, index) => (
              <div key={index} className="space-y-4 rounded-md border p-5">
                <h3 className="font-semibold">시작 설정 {index + 1}</h3>
                {field(
                  `startSettings.${index}.name`,
                  '시작 장면 이름 (최대 100자)',
                  false,
                  100,
                )}
                {field(`startSettings.${index}.prologue`, '프롤로그', true)}
                {field(
                  `startSettings.${index}.startSituation`,
                  '시작 상황',
                  true,
                )}
                {start.suggestedInputs.map((_, position) =>
                  field(
                    `startSettings.${index}.suggestedInputs.${position}`,
                    `추천 입력 ${position + 1}`,
                  ),
                )}
                <h4 className="font-medium">엔딩 · 최대 10개</h4>
                {start.endings.map((_, position) => (
                  <div
                    key={position}
                    className="space-y-4 rounded-sm border p-4">
                    {field(
                      `startSettings.${index}.endings.${position}.name`,
                      '엔딩 이름 (최대 100자)',
                      false,
                      100,
                    )}
                    {field(
                      `startSettings.${index}.endings.${position}.requirement.minTurns`,
                      '최소 턴 수',
                      false,
                      undefined,
                      true,
                    )}
                    {field(
                      `startSettings.${index}.endings.${position}.requirement.achievementCondition`,
                      '달성 조건',
                      true,
                    )}
                    {field(
                      `startSettings.${index}.endings.${position}.epilogue`,
                      '엔딩 연출 방향',
                      true,
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        update(
                          `startSettings.${index}.endings`,
                          start.endings.filter(
                            (_, number) => number !== position,
                          ),
                        )
                      }>
                      엔딩 {position + 1} 제거
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={start.endings.length >= 10}
                  onClick={() =>
                    update(`startSettings.${index}.endings`, [
                      ...start.endings,
                      {
                        name: '',
                        requirement: { minTurns: 0, achievementCondition: '' },
                        epilogue: '',
                      },
                    ])
                  }>
                  시작 설정 {index + 1} 엔딩 추가
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    update(
                      'startSettings',
                      payload.startSettings.filter(
                        (_, number) => number !== index,
                      ),
                    )
                  }>
                  시작 설정 {index + 1} 제거
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update('startSettings', [
                  ...payload.startSettings,
                  emptyOriginal().startSettings[0],
                ])
              }>
              시작 설정 추가
            </Button>
          </Card>
          <Card className="space-y-5">
            <h2 className="text-lg font-semibold">주요 사건 · 최대 10개</h2>
            {payload.mainEvents.map((_, index) => (
              <div key={index} className="space-y-4 rounded-md border p-5">
                {field(
                  `mainEvents.${index}.name`,
                  '사건 이름 (최대 100자)',
                  false,
                  100,
                )}
                {field(`mainEvents.${index}.description`, '사건 설명', true)}
                {field(
                  `mainEvents.${index}.keySentence`,
                  '관련성 판단 문장',
                  true,
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    update(
                      'mainEvents',
                      payload.mainEvents.filter(
                        (_, number) => number !== index,
                      ),
                    )
                  }>
                  주요 사건 {index + 1} 제거
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={payload.mainEvents.length >= 10}
              onClick={() =>
                update('mainEvents', [
                  ...payload.mainEvents,
                  { name: '', description: '', keySentence: '' },
                ])
              }>
              주요 사건 추가
            </Button>
          </Card>
          {Object.keys(errors).length ? (
            <div
              role="alert"
              className="rounded-md border border-destructive p-4 text-sm text-destructive">
              <p>입력한 항목을 확인하세요.</p>
              <ul className="mt-2 list-inside list-disc">
                {[...new Set(Object.values(errors))].map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {failure ? (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="outline">
              {pending
                ? '저장 중…'
                : initialStatus === 'PUBLISHED'
                  ? '변경 저장'
                  : '초안 저장'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (validate('PUBLISHED')) {
                  setFailure('');
                  setConfirm(true);
                }
              }}>
              공개
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            초안은 제목이 필수입니다. 발행한 오리지널의 변경은 저장 즉시
            반영되며 초안 상태로 되돌릴 수 없습니다.
          </p>
        </fieldset>
      </form>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="오리지널 공개 확인"
        description="입력한 내용을 마냑 공식 오리지널로 공개합니다. 현재 발행한 내용이 있으면 새 내용으로 바뀝니다."
        pending={pending}
        error={failure}
        onConfirm={() => void save('PUBLISHED')}
      />
    </>
  );
}

function ExistingOriginalEditor({ id }: { id: string }) {
  const query = useApi<OriginalDetail>(
    `/api/originals/${encodeURIComponent(id)}`,
  );

  return (
    <>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <OriginalEditor
          key={id}
          id={id}
          initial={originalFormValues(query.data)}
          initialStatus={query.data.status}
          initialVisibility={query.data.visibility}
          thumbnailUrl={query.data.thumbnailUrl}
        />
      ) : null}
    </>
  );
}

export function OriginalFormScreen({ id }: { id?: string }) {
  return id ? (
    <ExistingOriginalEditor id={id} />
  ) : (
    <OriginalEditor initial={emptyOriginal()} />
  );
}
