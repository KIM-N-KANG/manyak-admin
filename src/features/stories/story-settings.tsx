'use client';

import { type ReactNode, useRef, useState } from 'react';

import { Dialog } from '@base-ui/react/dialog';
import Image from 'next/image';

import { QueryState, Section } from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { FormSkeleton } from '@/components/admin/loading-ui';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { imageStatusLabel } from '@/features/moderation/labels';
import { useApi } from '@/features/shared/use-api';
import type { StorySettings } from '@/features/stories/types';

export const storySettingsHelp =
  '제작자가 저장한 설정 원문입니다. {username}은 채팅에서 주인공 이름으로 바뀝니다. 검수 중인 수정 내용은 승인된 뒤에 보입니다.';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-2 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** 원문을 줄바꿈·연속 공백과 함께 보이고 빈 값은 "입력 없음"으로 보인다. */
function Text({ value }: { value: string | null }) {
  return value ? (
    <p className="leading-6 break-words whitespace-pre-wrap">{value}</p>
  ) : (
    <p className="text-muted-foreground">입력 없음</p>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StatusBadge({ status }: { status: string }) {
  return status === 'APPROVED' ? null : (
    <span className="inline-flex rounded-sm border bg-muted px-2 py-1 text-xs">
      {imageStatusLabel(status)}
    </span>
  );
}

/** 작은 이미지를 누르면 대화상자에서 크게 보이고 불러오지 못하면 대체 문구를 보인다. */
function SettingImage({
  src,
  name,
  status,
  caption = true,
}: {
  src: string;
  name: string;
  status: string;
  caption?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const close = useRef<HTMLButtonElement>(null);

  return (
    <figure className="w-28">
      {failed ? (
        <div className="flex h-36 w-28 flex-col items-center justify-center gap-1 rounded-sm border bg-muted p-2 text-center text-xs text-muted-foreground">
          <span className="break-keep">이미지 불러오기 실패</span>
          <span className="break-all">{name}</span>
        </div>
      ) : (
        <Dialog.Root>
          <Dialog.Trigger
            aria-label={`${name} 크게 보기`}
            className="block h-36 w-28 rounded-sm bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Image
              unoptimized
              src={src}
              alt={name}
              width={112}
              height={144}
              onError={() => setFailed(true)}
              className="h-full w-full object-contain"
            />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
            <Dialog.Popup
              initialFocus={close}
              className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-3rem)] w-[calc(100%-3rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-md border bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <Dialog.Title className="font-semibold break-all">
                  {name}
                </Dialog.Title>
                <StatusBadge status={status} />
                <Dialog.Close
                  ref={close}
                  render={<Button variant="outline" className="ml-auto" />}>
                  닫기
                </Dialog.Close>
              </div>
              <Image
                unoptimized
                src={src}
                alt={name}
                width={1200}
                height={1600}
                className="min-h-0 w-full flex-1 object-contain"
              />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      <figcaption className="mt-2 flex flex-col items-start gap-1 text-xs">
        {caption && !failed ? <span className="break-all">{name}</span> : null}
        <StatusBadge status={status} />
      </figcaption>
    </figure>
  );
}

function Settings({ data: d }: { data: StorySettings }) {
  return (
    <div className="space-y-5">
      <Card>
        <dl className="space-y-6">
          <Field label="표지">
            {d.thumbnailUrl ? (
              <SettingImage
                src={d.thumbnailUrl}
                name="표지"
                status={d.thumbnailModerationStatus}
                caption={false}
              />
            ) : (
              <p className="text-muted-foreground">표지 없음</p>
            )}
          </Field>
          <Field label="한 줄 소개">
            <Text value={d.oneLineIntro} />
          </Field>
          <Field label="주요 내용">
            <Text value={d.description} />
          </Field>
          <Field label="기본 주인공 이름">
            <Text value={d.protagonistName} />
          </Field>
          <Field label="세계관 설정">
            <Text value={d.storySettings.worldSetting} />
          </Field>
          <Field label="인물 설정">
            <Text value={d.storySettings.characterSetting} />
          </Field>
          <Field label="주인공 역할 설정">
            <Text value={d.storySettings.userRoleSetting} />
          </Field>
          <Field label="전개 규칙">
            <Text value={d.storySettings.ruleSetting} />
          </Field>
        </dl>
      </Card>
      <section>
        <h3 className="mb-3 font-semibold">인물</h3>
        {d.characters.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {d.characters.map((c) => (
              <Card key={c.id}>
                <dl className="space-y-5">
                  <Field label="인물 이름">
                    <Text value={c.name} />
                  </Field>
                  <Field label="인물 소개">
                    <Text value={c.description} />
                  </Field>
                  <Field label="이미지">
                    {c.images.length ? (
                      <div className="flex flex-wrap gap-4">
                        {c.images.map((image) => (
                          <SettingImage
                            key={image.id}
                            src={image.imageUrl}
                            name={image.imageName}
                            status={image.moderationStatus}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">이미지 없음</p>
                    )}
                  </Field>
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>인물 없음</Empty>
        )}
      </section>
      <section>
        <h3 className="mb-3 font-semibold">시작 설정</h3>
        {d.startSettings.length ? (
          <div className="space-y-5">
            {d.startSettings.map((start) => (
              <Card key={start.id}>
                <dl className="space-y-5">
                  <Field label="상황 이름">
                    <Text value={start.name} />
                  </Field>
                  <Field label="프롤로그">
                    <Text value={start.prologue} />
                  </Field>
                  <Field label="시작 상황">
                    <Text value={start.startSituation} />
                  </Field>
                  <Field label="추천 입력">
                    {start.suggestedInputs.length ? (
                      <ol className="list-decimal space-y-1 pl-5">
                        {start.suggestedInputs.map((input, index) => (
                          <li
                            key={index}
                            className="break-words whitespace-pre-wrap">
                            {input}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-muted-foreground">추천 입력 없음</p>
                    )}
                  </Field>
                  <Field label="엔딩">
                    {start.endings.length ? (
                      <div className="space-y-3">
                        {start.endings.map((ending, index) => (
                          <dl
                            key={index}
                            className="grid gap-4 rounded-sm border p-4 sm:grid-cols-2">
                            <Field label="엔딩 이름">
                              <Text value={ending.name} />
                            </Field>
                            <Field label="최소 턴 수">
                              {ending.requirement.minTurns}턴
                            </Field>
                            <Field label="달성 조건">
                              <Text
                                value={ending.requirement.achievementCondition}
                              />
                            </Field>
                            <Field label="에필로그">
                              <Text value={ending.epilogue} />
                            </Field>
                          </dl>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">엔딩 없음</p>
                    )}
                  </Field>
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>시작 설정 없음</Empty>
        )}
      </section>
      <section>
        <h3 className="mb-3 font-semibold">주요 사건</h3>
        {d.mainEvents.length ? (
          <div className="space-y-5">
            {d.mainEvents.map((event, index) => (
              <Card key={index}>
                <dl className="space-y-5">
                  <Field label="사건 이름">
                    <Text value={event.name} />
                  </Field>
                  <Field label="사건 설명">
                    <Text value={event.description} />
                  </Field>
                  <Field label="키 문장">
                    <Text value={event.keySentence} />
                  </Field>
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <Empty>주요 사건 없음</Empty>
        )}
      </section>
    </div>
  );
}

export function StorySettingsSection({ storyId }: { storyId: string }) {
  const query = useApi<StorySettings>(
    `/api/stories/${encodeURIComponent(storyId)}/settings`,
  );

  return (
    <Section
      title="스토리 설정"
      help={
        <HelpTooltip label="스토리 설정 도움말">
          {storySettingsHelp}
        </HelpTooltip>
      }>
      <QueryState
        skeleton={<FormSkeleton />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? <Settings data={query.data} /> : null}
    </Section>
  );
}
