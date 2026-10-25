'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { FetchError } from '@/api/mutator/custom-instance';
import {
  DataTable,
  dateTime,
  DetailGrid,
  PageHeading,
  QueryState,
  Status,
  TextLink,
} from '@/components/admin/data-ui';
import { HelpTooltip } from '@/components/admin/help-tooltip';
import { ListFilterForm } from '@/components/admin/list-search';
import { DetailSkeleton, TableSkeleton } from '@/components/admin/loading-ui';
import { PageNavigation } from '@/components/admin/page-navigation';
import { SuccessNotice } from '@/components/admin/reason-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useManagementList } from '@/features/management/use-management-list';
import { useApi } from '@/features/shared/use-api';

import {
  attemptHelp,
  causeHelp,
  causeLabel,
  fieldsHelp,
  issueHelp,
  kindLabel,
  pathLabel,
  ruleLabel,
  statusLabel,
  submissionStatuses,
} from './labels';
import { useSubmissionRelease } from './release-dialog';
import type { Submission, SubmissionDetail } from './types';

export function SubmissionsScreen() {
  const { query, params, href, sort, order, changeSort } =
    useManagementList<Submission>('/api/moderation/submissions', 'createdAt', {
      page: '1',
      size: '20',
      sort: 'createdAt',
      order: 'desc',
    });
  const router = useRouter(),
    pathname = usePathname();
  const release = useSubmissionRelease();

  function clear(key: string) {
    const next = new URLSearchParams(params);

    next.delete(key);
    next.set('page', '1');
    router.push(`${pathname}?${next}`);
  }

  return (
    <>
      <PageHeading title="검수 제출" />
      <ListFilterForm
        label="제출본 ID 또는 제목"
        placeholder="제출본 ID 또는 제목">
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">
          상태
          <select
            name="status"
            className="control"
            defaultValue={params.get('status') ?? ''}>
            <option value="">전체</option>
            {Object.entries(submissionStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex gap-2">
          <legend className="mb-2 text-xs text-muted-foreground">
            접수일 (KST)
          </legend>
          {[
            ['from', '시작 날짜'],
            ['to', '끝 날짜'],
          ].map(([name, label]) => (
            <label
              key={name}
              className="flex flex-col gap-1 text-xs text-muted-foreground">
              {label}
              <input
                type="date"
                name={name}
                defaultValue={params.get(name) ?? ''}
                className="control"
              />
            </label>
          ))}
        </fieldset>
        {(
          [
            ['memberId', '소유 회원'],
            ['storyId', '스토리'],
          ] as const
        ).map(([key, label]) =>
          params.get(key) ? (
            <span
              key={key}
              className="flex max-w-full items-center gap-2 rounded-sm bg-muted px-2 py-1 text-xs break-all">
              {label} {params.get(key)}
              <Button
                type="button"
                variant="ghost"
                aria-label={`${label} 조건 지우기`}
                onClick={() => clear(key)}>
                ×
              </Button>
            </span>
          ) : null,
        )}
      </ListFilterForm>
      {release.success ? (
        <SuccessNotice key={release.success} message="보류를 해제했습니다." />
      ) : null}
      <QueryState
        skeleton={<TableSkeleton columns={11} />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={[
              { label: '접수 시각 (KST)', key: 'createdAt' },
              '종류',
              '상태',
              '스토리',
              '소유자',
              {
                label: '반려 사유',
                help: (
                  <HelpTooltip label="반려 사유 도움말">
                    {issueHelp}
                  </HelpTooltip>
                ),
              },
              {
                label: '보류 사유 또는 실패 원인',
                help: (
                  <HelpTooltip label="보류 사유 도움말">
                    {causeHelp}
                  </HelpTooltip>
                ),
              },
              {
                label: '검수 회차',
                help: (
                  <HelpTooltip label="검수 회차 도움말">
                    {attemptHelp}
                  </HelpTooltip>
                ),
              },
              { label: '판정 시각 (KST)', key: 'decidedAt' },
              { label: '보류 시각 (KST)', key: 'heldAt' },
              '동작',
            ]}
            sorting={{ key: sort, order, onSort: changeSort }}
            empty={!query.data.items.length}
            emptyContent="조건에 맞는 검수 제출이 없습니다.">
            {query.data.items.map((row) => (
              <tr
                key={row.submissionId}
                className="cursor-pointer"
                onClick={(event) => {
                  if (!(event.target as Element).closest('a,button'))
                    router.push(`/moderation/submissions/${row.submissionId}`);
                }}>
                <td>
                  <TextLink
                    href={`/moderation/submissions/${row.submissionId}`}>
                    {dateTime(row.createdAt)}
                  </TextLink>
                </td>
                <td>{kindLabel(row.kind)}</td>
                <td>{statusLabel(row.status)}</td>
                <td>
                  {row.story.storyId ? (
                    <TextLink href={`/stories/${row.story.storyId}`}>
                      {row.story.title}
                    </TextLink>
                  ) : (
                    <>
                      {row.story.title}{' '}
                      <span className="text-xs text-muted-foreground">
                        새 스토리
                      </span>
                    </>
                  )}
                </td>
                <td>
                  <TextLink href={`/members/${row.owner.memberId}`}>
                    {row.owner.nickname}
                  </TextLink>
                </td>
                <td>
                  {row.issueCount > 0 ? (
                    <div className="max-w-80 whitespace-normal">
                      <p>{row.firstIssueReason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.issueRules.map(ruleLabel).join(', ')}
                        {row.issueCount > 1
                          ? ` 외 ${row.issueCount - 1}건`
                          : ''}
                      </p>
                    </div>
                  ) : null}
                </td>
                <td>
                  {causeLabel(
                    row.status === 'HELD'
                      ? row.holdReason
                      : row.status === 'FAILED'
                        ? row.errorCode
                        : null,
                  )}
                </td>
                <td>{row.attempt}</td>
                <td>{row.decidedAt ? dateTime(row.decidedAt) : ''}</td>
                <td>
                  {row.status === 'HELD' && row.heldAt
                    ? dateTime(row.heldAt)
                    : ''}
                </td>
                <td>
                  {row.status === 'HELD' ? (
                    <Button
                      variant="outline"
                      onClick={(event) =>
                        release.open(row.submissionId, event.currentTarget)
                      }>
                      해제
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </DataTable>
          <PageNavigation
            data={query.data}
            href={href}
            label="검수 제출 페이지"
          />
        </>
      ) : null}
      {release.dialog}
    </>
  );
}

export function SubmissionDetailScreen({ id }: { id: string }) {
  const query = useApi<SubmissionDetail>(
    `/api/moderation/submissions/${encodeURIComponent(id)}`,
  );
  const release = useSubmissionRelease();
  const d = query.data;
  const missing =
    query.error instanceof FetchError && query.error.status === 404;

  return (
    <>
      <Link
        href="/moderation/submissions"
        className="mb-5 inline-block text-sm text-muted-foreground">
        ← 검수 제출 목록
      </Link>
      <PageHeading title="검수 제출 상세">
        {d?.status === 'HELD' && !query.isError ? (
          <Button onClick={(event) => release.open(id, event.currentTarget)}>
            해제
          </Button>
        ) : null}
      </PageHeading>
      {release.success ? (
        <SuccessNotice key={release.success} message="보류를 해제했습니다." />
      ) : null}
      {missing ? (
        <p role="alert">제출본을 찾을 수 없습니다.</p>
      ) : (
        <QueryState
          skeleton={<DetailSkeleton split />}
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
        />
      )}
      {d && !query.isError ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
            <span>
              제출본 ID <code>{d.submissionId}</code>
            </span>
            <span>{kindLabel(d.kind)}</span>
            <span>{statusLabel(d.status)}</span>
            <TextLink href={`/members/${d.owner.memberId}`}>
              {d.owner.nickname}
            </TextLink>
            {d.story.storyId ? (
              <TextLink href={`/stories/${d.story.storyId}`}>
                {d.story.title}
              </TextLink>
            ) : (
              <span>{d.story.title} (새 스토리)</span>
            )}
          </div>
          <div className="mb-6 grid gap-5 xl:grid-cols-[1fr_2fr]">
            <Card>
              <h2 className="mb-5 font-semibold">처리 경과</h2>
              <DetailGrid
                items={[
                  ['접수 시각', dateTime(d.createdAt)],
                  ['판정 시각', d.decidedAt ? dateTime(d.decidedAt) : ''],
                  ['보류 시각', d.heldAt ? dateTime(d.heldAt) : ''],
                  ['마지막 변경 시각', dateTime(d.updatedAt)],
                  ['검수 회차', d.attempt],
                  ['자동 재시도 횟수', d.retryCount],
                  ['보류 사유', causeLabel(d.holdReason)],
                  ['실패 원인', causeLabel(d.errorCode)],
                ]}
              />
            </Card>
            <Card>
              <div className="mb-5 flex items-center gap-2">
                <h2 className="font-semibold">검수 대상 필드</h2>
                <HelpTooltip label="검수 대상 필드 도움말">
                  {fieldsHelp}
                </HelpTooltip>
              </div>
              <DetailGrid
                items={[
                  ['제목', d.fields.title],
                  ['한 줄 소개', d.fields.oneLineIntro ?? ''],
                  ['소개', d.fields.description ?? ''],
                  ['기본 주인공 이름', d.fields.protagonistName ?? ''],
                  ['장르', d.fields.genres.join(', ')],
                  [
                    '공개 범위',
                    <Status key="visibility" value={d.fields.visibility} />,
                  ],
                  ['인물 이름', d.fields.characterNames.join(', ')],
                ]}
              />
            </Card>
          </div>
          <section className="mb-6">
            <h2 className="mb-4 font-semibold">위반 항목</h2>
            <DataTable
              headers={['위치', '유형', '기준', '이유']}
              empty={!d.issues.length}
              emptyContent="위반 항목이 없습니다.">
              {d.issues.map((issue, index) => (
                <tr key={index}>
                  <td>{pathLabel(issue.path)}</td>
                  <td>
                    {(
                      { TEXT: '글', IMAGE: '이미지' } as Record<string, string>
                    )[issue.type] ?? issue.type}
                  </td>
                  <td>{ruleLabel(issue.rule)}</td>
                  <td className="max-w-xl !whitespace-normal">
                    {issue.reason}
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
          <section>
            <h2 className="mb-4 font-semibold">이미지 결과</h2>
            <DataTable
              headers={['이미지', '검수 상태', '이미지 오류']}
              empty={!d.imageResults.length}
              emptyContent="이미지 결과가 없습니다.">
              {d.imageResults.map((image, index) => (
                <tr key={index}>
                  <td>{image.label}</td>
                  <td>
                    {(
                      {
                        APPROVED: '통과',
                        REJECTED: '반려',
                        ERROR: '오류',
                        PENDING: '판정 전',
                      } as Record<string, string>
                    )[image.moderationStatus] ?? image.moderationStatus}
                  </td>
                  <td>{causeLabel(image.errorCode)}</td>
                </tr>
              ))}
            </DataTable>
          </section>
        </>
      ) : null}
      {release.dialog}
    </>
  );
}
