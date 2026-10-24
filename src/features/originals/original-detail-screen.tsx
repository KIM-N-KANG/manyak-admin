'use client';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';

import { customInstance } from '@/api/mutator/custom-instance';
import {
  dateTime,
  NumberValue,
  PageHeading,
  QueryState,
  Section,
  Status,
  TextLink,
} from '@/components/admin/data-ui';
import { DetailSkeleton } from '@/components/admin/loading-ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/features/originals/confirm-dialog';
import type { OriginalDetail } from '@/features/originals/types';
import { useApi } from '@/features/shared/use-api';

export function OriginalDetailScreen({ id }: { id: string }) {
  const query = useApi<OriginalDetail>(
    `/api/originals/${encodeURIComponent(id)}`,
  );
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const data = query.data;
  const target = data?.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
  const preview = (value: string | null) =>
    (value ?? '').replaceAll(
      '{username}',
      data?.protagonistName ?? '{username}',
    );

  async function changeVisibility() {
    setPending(true);
    setError('');

    try {
      await customInstance(`/api/originals/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: target, reason }),
      });
      await client.invalidateQueries();
      setConfirm(false);
    } catch {
      setError('공개 상태를 변경하지 못했습니다. 다시 시도하세요.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <TextLink href="/originals">← 오리지널 목록</TextLink>
      </div>
      <QueryState
        skeleton={<DetailSkeleton />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {data ? (
        <>
          <PageHeading title={preview(data.title) || '(제목 없는 초안)'}>
            <div className="flex flex-wrap gap-2">
              <Link href={`/originals/${id}/edit`} className={buttonVariants()}>
                수정
              </Link>
              {data.status === 'PUBLISHED' ? (
                <Button
                  variant="outline"
                  disabled={!reason.trim()}
                  onClick={() => setConfirm(true)}>
                  {target === 'PUBLIC' ? '공개로 전환' : '비공개로 전환'}
                </Button>
              ) : null}
              <Link
                href={`/notifications/campaigns/new?storyId=${encodeURIComponent(id)}`}
                className={buttonVariants({ variant: 'outline' })}>
                홍보 알림 만들기
              </Link>
            </div>
          </PageHeading>
          <label className="mb-5 grid gap-2 text-sm">
            변경 사유
            <input
              className="control"
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Card>
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              {data.thumbnailUrl ? (
                <Image
                  unoptimized
                  src={data.thumbnailUrl}
                  alt={`${preview(data.title)} 표지`}
                  width={220}
                  height={300}
                  className="h-72 w-full rounded-sm bg-muted object-contain"
                />
              ) : (
                <div className="flex h-72 items-center justify-center rounded-sm bg-muted text-sm text-muted-foreground">
                  표지 없음
                </div>
              )}
              <div>
                <Status value={data.visibility} />
                <p className="mt-3 text-sm text-muted-foreground">
                  공식 계정 {data.owner.nickname} ·{' '}
                  {data.status === 'DRAFT' ? '초안' : '발행'} ·{' '}
                  {dateTime(data.updatedAt)} 수정
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {data.genres.join(' · ')}
                </p>
                <p className="mt-5 text-xl font-semibold">
                  {preview(data.oneLineIntro) || '한 줄 소개 없음'}
                </p>
                <p className="mt-4 text-sm leading-7 whitespace-pre-wrap">
                  {preview(data.description) || '소개 없음'}
                </p>
                <p className="mt-6 text-sm">
                  채팅 <NumberValue value={data.chatCount} />개 · 총{' '}
                  <NumberValue value={data.totalTurns} />턴
                </p>
              </div>
            </div>
          </Card>
          <Section title="주인공">
            <Card>
              <h3 className="font-semibold">
                {data.protagonistName || '이름 미지정'}
              </h3>
              <p className="mt-3 text-sm whitespace-pre-wrap">
                {preview(data.storySettings.userRoleSetting) || '소개 없음'}
              </p>
            </Card>
          </Section>
          <Section title="주변 인물">
            <div className="grid gap-5 md:grid-cols-2">
              {data.characters.map((character, index) => (
                <Card key={character.id ?? index}>
                  <h3 className="font-semibold">
                    {character.name || '이름 미지정'}
                  </h3>
                  <p className="mt-2 text-sm">
                    {preview(character.description) || '소개 없음'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {character.images
                      .filter((image) => image.imageUrl)
                      .map((image, position) => (
                        <Image
                          unoptimized
                          key={image.id ?? position}
                          src={image.imageUrl!}
                          alt={image.imageName}
                          width={120}
                          height={160}
                          className="h-40 w-28 rounded-sm bg-muted object-cover"
                        />
                      ))}
                  </div>
                </Card>
              ))}
            </div>
            {!data.characters.length ? (
              <p className="text-sm text-muted-foreground">
                등록한 주변 인물이 없습니다.
              </p>
            ) : null}
          </Section>
          <Section title="시작 설정">
            <div className="space-y-5">
              {data.startSettings.map((start, index) => (
                <Card key={start.id ?? index}>
                  <h3 className="font-semibold">
                    {start.name || '이름 없는 시작 설정'}
                  </h3>
                  <p className="mt-3 text-sm leading-7 whitespace-pre-wrap">
                    {preview(start.prologue)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {preview(start.startSituation)}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {start.suggestedInputs.map((input, position) => (
                      <li key={position} className="rounded-sm border p-3">
                        {preview(input) || '추천 입력 미작성'}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </Section>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title={`${target === 'PUBLIC' ? '공개' : '비공개'} 전환 확인`}
            description={
              target === 'PUBLIC'
                ? '이 오리지널을 사용자에게 공개합니다.'
                : '이 오리지널을 비공개로 전환합니다.'
            }
            pending={pending}
            error={error}
            onConfirm={() => void changeVisibility()}
          />
        </>
      ) : null}
    </>
  );
}
