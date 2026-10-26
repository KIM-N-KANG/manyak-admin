'use client';

import type { ReactNode } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  DataTable,
  dateTime,
  NumberValue,
  PageHeading,
  QueryState,
  Status,
  TextLink,
} from '@/components/admin/data-ui';
import { ExternalToolLink } from '@/components/admin/external-tool-link';
import { ListFilterForm, SearchEmpty } from '@/components/admin/list-search';
import { TableSkeleton } from '@/components/admin/loading-ui';
import { PageNavigation } from '@/components/admin/page-navigation';
import type { ChatRoom } from '@/features/chats/types';
import type { MemberListItem } from '@/features/members/types';
import type { PaymentOrder } from '@/features/payments/types';
import type { ListDomain } from '@/features/shared/list-config';
import { usePagedList } from '@/features/shared/use-paged-list';
import type { Story } from '@/features/stories/types';
import { externalLinks } from '@/lib/external-links';

type Domain = ListDomain;

type Filter = {
  key: string;
  label: string;
  options?: [string, string][];
  emptyLabel?: string;
  type?: 'date' | 'search' | 'text';
  placeholder?: string;
};

const filterLabels: Record<string, string> = {
  memberId: '회원 ID',
  excludeDeleted: '탈퇴 회원 제외',
  storyId: '스토리 ID',
  moderationStatus: '검수 상태',
  supportingCharacterCount: '주변 인물 수',
  startedAs: '채팅 소유자 유형',
  turnBucket: '턴 구간',
  chatBucket: '채팅 생성 구간',
  hasFirstMessage: '900초 이내 첫 입력',
  aiFeature: 'AI 기능',
  attendanceDate: '출석일',
  creditDate: '이프 기록일',
  creditDirection: '이프 변동 유형',
  chatFrom: '채팅 생성 시작일',
  chatTo: '채팅 생성 종료일',
  aiFrom: 'AI 호출 시작일',
  aiTo: 'AI 호출 종료일',
  aiStatus: 'AI 호출 상태',
  hasLatency: '지연값',
  creationFrom: '제작 시작일',
  creationTo: '제작 종료일',
  turnDate: '턴 활동일',
  from: '가입 시작일',
  to: '가입 종료일',
  size: '페이지 크기',
};
const filterValues: Record<string, string> = {
  granted: '적립',
  spent: '소모',
  SUCCEEDED: '성공',
  FINISHED: '성공과 실패 완료',
  HELD: '보류',
  APPROVED: '승인',
  GUEST: '게스트',
  MEMBER: '회원',
  true: '있음',
  false: '없음',
  chat_response: 'AI 응답 생성',
  chat_image: '실시간 이미지 생성',
  choice_generation: '선택지 생성',
  storyline_generation: '스토리라인 생성',
  story_completion: '간편 제작',
};
const turnBuckets = [
  '0턴',
  '1턴',
  '2턴',
  '3턴',
  '4턴',
  '5턴',
  '6턴',
  '7~9턴',
  '10~14턴',
  '15~19턴',
  '20~29턴',
  '30~49턴',
  '50턴 이상',
];
const chatBuckets = ['1개', '2개', '3~4개', '5~9개', '10개 이상'];

function filterValue(key: string, value: string) {
  return key === 'turnBucket'
    ? (turnBuckets[Number(value)] ?? value)
    : key === 'chatBucket'
      ? (chatBuckets[Number(value)] ?? value)
      : (filterValues[value] ?? value);
}

const dates: Filter[] = [
  { key: 'from', label: '시작일 (KST)', type: 'date' },
  { key: 'to', label: '종료일 (KST)', type: 'date' },
];
const configs: Record<Domain, { title: string; filters: Filter[] }> = {
  stories: {
    title: '스토리',
    filters: [
      {
        key: 'scope',
        label: '범위',
        options: [
          ['original', '오리지널'],
          ['user', '사용자 제작'],
        ],
      },
      {
        key: 'genre',
        label: '장르',
        options: ['로맨스', '판타지', '일상', '미스터리', 'SF'].map((g) => [
          g,
          g,
        ]),
      },
      {
        key: 'visibility',
        label: '공개 상태',
        options: [
          ['PUBLIC', '공개'],
          ['PRIVATE', '비공개'],
        ],
      },
      {
        key: 'deleted',
        label: '삭제된 스토리',
        emptyLabel: '제외',
        options: [
          ['include', '포함'],
          ['only', '삭제된 스토리만'],
        ],
      },
      ...dates,
    ],
  },
  members: {
    title: '회원',
    filters: [
      {
        key: 'status',
        label: '상태',
        options: [
          ['ACTIVE', '정상'],
          ['SUSPENDED', '정지'],
          ['DELETED', '탈퇴'],
        ],
      },
    ],
  },
  payments: {
    title: '결제',
    filters: [
      {
        key: 'status',
        label: '상태',
        options: [
          ['COMPLETED', '결제 완료'],
          ['REFUNDED', '환불'],
        ],
      },
      ...dates,
    ],
  },
  chats: {
    title: '채팅',
    filters: [
      {
        key: 'turnBucket',
        label: '턴 구간',
        options: turnBuckets.map((label, index) => [String(index), label]),
      },
      {
        key: 'storyId',
        label: '스토리 ID',
        type: 'text',
        placeholder: '스토리 공개 식별자',
      },
      {
        key: 'memberId',
        label: '회원 ID',
        type: 'text',
        placeholder: '회원 공개 식별자',
      },
      {
        key: 'deleted',
        label: '삭제된 채팅',
        emptyLabel: '제외',
        options: [
          ['include', '포함'],
          ['only', '삭제된 채팅만'],
        ],
      },
      ...dates,
    ],
  },
};
const headers: Record<Domain, (string | { label: string; key: string })[]> = {
  stories: [
    '스토리',
    '장르 · 범위',
    '공개 상태',
    { label: '채팅 수', key: 'chatCount' },
    { label: '총 턴 수', key: 'totalTurns' },
    { label: '생성일', key: 'createdAt' },
  ],
  members: [
    '회원',
    '회원 ID',
    '상태',
    { label: '가입일', key: 'createdAt' },
    { label: '최근 활동', key: 'lastActiveAt' },
    { label: '채팅 수', key: 'chatCount' },
    { label: '이프 소모', key: 'creditsSpent' },
    { label: '결제액', key: 'paidKrw' },
  ],
  payments: [
    '주문',
    '회원',
    '상태',
    { label: '결제 금액', key: 'priceKrw' },
    { label: '적립 이프', key: 'creditAmount' },
    { label: '완료 시각', key: 'completedAt' },
    { label: '환불 시각', key: 'refundedAt' },
  ],
  chats: [
    '채팅',
    '스토리',
    '회원',
    '시작 당시',
    { label: '턴 수', key: 'turnCount' },
    { label: '시작 시각', key: 'startedAt' },
    { label: '마지막 활동', key: 'lastActiveAt' },
    { label: '이프 소모', key: 'creditsSpent' },
  ],
};

export function StoryRows({ items }: { items: Story[] }) {
  return items.map((s) => (
    <tr key={s.storyId}>
      <td>
        <TextLink href={`/stories/${s.storyId}`}>{s.title}</TextLink>
        {s.deletedAt ? (
          <span className="ml-2">
            <Status value="삭제됨" />
          </span>
        ) : null}
      </td>
      <td>
        {s.genre} ·{' '}
        {s.scope === 'original' ? (
          <span className="rounded-sm border bg-primary/5 px-2 py-1 text-xs text-primary-text">
            오리지널
          </span>
        ) : (
          '사용자 제작'
        )}
      </td>
      <td>
        <Status value={s.visibility} />
      </td>
      <td>
        <NumberValue value={s.chatCount} />
      </td>
      <td>
        <NumberValue value={s.totalTurns} />
      </td>
      <td>{dateTime(s.createdAt)}</td>
    </tr>
  ));
}
export function ChatRows({ items }: { items: ChatRoom[] }) {
  return items.map((c) => (
    <tr key={c.chatId}>
      <td>
        <TextLink href={`/chats/${c.chatId}`}>{c.chatId.slice(-8)}</TextLink>
        {c.deletedAt ? (
          <span className="ml-2">
            <Status value="삭제됨" />
          </span>
        ) : null}
      </td>
      <td>
        <TextLink href={`/stories/${c.story.storyId}`}>
          {c.story.title}
        </TextLink>
      </td>
      <td>
        {c.member ? (
          <TextLink href={`/members/${c.member.memberId}`}>
            {c.member.nickname}
          </TextLink>
        ) : (
          '게스트'
        )}
      </td>
      <td>
        <Status value={c.startedAs} />
      </td>
      <td>
        <NumberValue value={c.turnCount} />
      </td>
      <td>{dateTime(c.startedAt)}</td>
      <td>{dateTime(c.lastActiveAt)}</td>
      <td>
        <NumberValue value={c.creditsSpent} />
      </td>
    </tr>
  ));
}
export function PaymentRows({ items }: { items: PaymentOrder[] }) {
  return items.map((p) => (
    <tr key={p.orderId}>
      <td>
        <TextLink href={`/payments/${p.orderId}`}>
          {p.orderId.slice(-8)}
        </TextLink>
      </td>
      <td>
        <TextLink href={`/members/${p.member.memberId}`}>
          {p.member.nickname}
        </TextLink>
      </td>
      <td>
        <Status value={p.status} />
      </td>
      <td>
        <NumberValue value={p.priceKrw} />원
      </td>
      <td>
        <NumberValue value={p.creditAmount} />
      </td>
      <td>{dateTime(p.completedAt)}</td>
      <td>{p.refundedAt ? dateTime(p.refundedAt) : '—'}</td>
    </tr>
  ));
}
export function RelatedList({
  kind,
  scope,
}: {
  kind: 'stories' | 'chats' | 'payments';
  scope: Record<string, string>;
}) {
  const { query, sort, order, deleted, changeSort, changeDeleted, href } =
    usePagedList(kind, scope);
  const filter =
    kind === 'payments'
      ? null
      : configs[kind].filters.find((f) => f.key === 'deleted')!;

  return (
    <>
      {filter ? (
        <label className="mb-4 flex w-fit min-w-32 flex-col gap-2 text-xs text-muted-foreground">
          {filter.label}
          <select
            value={deleted}
            onChange={(event) => changeDeleted(event.target.value)}
            className="control">
            <option value="">{filter.emptyLabel}</option>
            {filter.options!.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <QueryState
        skeleton={<TableSkeleton columns={headers[kind].length} />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={headers[kind]}
            empty={!query.data.items.length}
            sorting={{ key: sort, order, onSort: changeSort }}>
            {kind === 'stories' ? (
              <StoryRows items={query.data.items as Story[]} />
            ) : kind === 'chats' ? (
              <ChatRows items={query.data.items as ChatRoom[]} />
            ) : (
              <PaymentRows items={query.data.items as PaymentOrder[]} />
            )}
          </DataTable>
          <PageNavigation
            data={query.data}
            href={href}
            label={`${configs[kind].title} 하위 목록 페이지`}
          />
        </>
      ) : null}
    </>
  );
}
export function ListScreen({ domain }: { domain: Domain }) {
  const params = useSearchParams();
  const config = configs[domain];
  const { query, sort, order, deleted, changeSort, href } =
    usePagedList(domain);

  const extras = [...params.entries()].filter(
    ([key]) =>
      !['page', 'sort', 'order', 'q'].includes(key) &&
      !config.filters.some((f) => f.key === key),
  );
  let rows: ReactNode = null;

  if (query.data) {
    if (domain === 'stories')
      rows = <StoryRows items={query.data.items as Story[]} />;
    else if (domain === 'chats')
      rows = <ChatRows items={query.data.items as ChatRoom[]} />;
    else if (domain === 'payments')
      rows = <PaymentRows items={query.data.items as PaymentOrder[]} />;
    else
      rows = (query.data.items as MemberListItem[]).map((m) => (
        <tr key={m.memberId}>
          <td>
            <TextLink href={`/members/${m.memberId}`}>{m.nickname}</TextLink>
          </td>
          <td className="font-mono text-xs">{m.memberId}</td>
          <td>
            <Status value={m.status} />
          </td>
          <td>{dateTime(m.createdAt)}</td>
          <td>{m.lastActiveAt ? dateTime(m.lastActiveAt) : '—'}</td>
          <td>
            <NumberValue value={m.chatCount} />
            {m.periodChatCount != null ? (
              <span className="ml-2 text-xs text-muted-foreground">
                (기간 {m.periodChatCount}개)
              </span>
            ) : null}
          </td>
          <td>
            <NumberValue value={m.creditsSpent} />
          </td>
          <td>
            <NumberValue value={m.paidKrw} />원
          </td>
        </tr>
      ));
  }

  return (
    <>
      <PageHeading title={config.title}>
        {domain === 'payments' && (
          <ExternalToolLink href={externalLinks.groble}>
            그로블에서 보기
          </ExternalToolLink>
        )}
      </PageHeading>
      <ListFilterForm
        label={`${config.title} 검색`}
        placeholder={
          domain === 'members'
            ? '회원 닉네임 일부, 회원 ID 또는 이메일로 검색하세요'
            : '검색어를 입력하세요'
        }>
        {config.filters.map((f) => (
          <label
            key={f.key}
            className="flex min-w-32 flex-col gap-2 text-xs text-muted-foreground">
            {f.label}
            {f.options ? (
              <select
                name={f.key}
                defaultValue={
                  f.key === 'deleted' ? deleted : (params.get(f.key) ?? '')
                }
                className="control">
                <option value="">{f.emptyLabel ?? '전체'}</option>
                {f.options.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="control max-w-full sm:min-w-44"
                type={f.type ?? 'text'}
                name={f.key}
                defaultValue={params.get(f.key) ?? ''}
                maxLength={f.key === 'query' ? 50 : undefined}
                placeholder={f.placeholder}
              />
            )}
          </label>
        ))}
      </ListFilterForm>
      {extras.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {extras.map(([key, value]) => (
            <span
              key={key}
              className="rounded-sm border bg-muted px-3 py-2 text-xs">
              {filterLabels[key] ?? '추가 조건'}: {filterValue(key, value)}
            </span>
          ))}
        </div>
      ) : null}
      <QueryState
        skeleton={<TableSkeleton columns={headers[domain].length} />}
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={headers[domain]}
            empty={!query.data.items.length}
            emptyContent={params.get('q') ? <SearchEmpty /> : undefined}
            sorting={{ key: sort, order, onSort: changeSort }}>
            {rows}
          </DataTable>
          <PageNavigation data={query.data} href={href} />
        </>
      ) : null}
    </>
  );
}
