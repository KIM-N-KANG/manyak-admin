'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import {
  Alert02Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Link01Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { keepPreviousData } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeSearch } from '@/features/shared/search';
import type { Page } from '@/features/shared/types';
import { useApi } from '@/features/shared/use-api';
import type { Story } from '@/features/stories/types';
import { cn } from '@/lib/utils';

const pageSize = 20;
const number = (value: number) => value.toLocaleString('ko-KR');

/** 검색 결과 요청 URL. 검색어가 없으면 채팅이 많은 공개 스토리 순이다. */
export function storySearchUrl(query: string) {
  const params = new URLSearchParams({
    size: String(pageSize),
    visibility: 'PUBLIC',
    sort: 'chatCount',
    order: 'desc',
  });

  if (query) params.set('q', query);

  return `/api/stories?${params}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const index = query ? text.toLowerCase().indexOf(query) : -1;

  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[2px] bg-link-soft text-primary-text">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

function OriginalBadge() {
  return (
    <span className="inline-flex items-center rounded-sm bg-link-soft px-1.5 text-xs leading-4 font-medium text-primary-text">
      오리지널
    </span>
  );
}

/** 장르, 소유자, 채팅 수, 턴 수를 가운뎃점으로 잇는 보조 줄. */
export function StoryMeta({
  story,
  query = '',
  className,
}: {
  story: Story;
  query?: string;
  className?: string;
}) {
  const parts: [string, ReactNode][] = [
    ['genre', story.genre],
    [
      'owner',
      story.scope === 'original' ? (
        <OriginalBadge />
      ) : story.owner ? (
        <Highlight text={story.owner.nickname} query={query} />
      ) : (
        '게스트'
      ),
    ],
    ['chats', `채팅 ${number(story.chatCount)}`],
    ['turns', `턴 ${number(story.totalTurns)}`],
  ];

  return (
    <span
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground',
        className,
      )}>
      {parts.map(([key, part], index) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          {index ? <span aria-hidden="true">·</span> : null}
          <span className="tabular-nums">{part}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * 공개 스토리를 검색해 고르는 WAI-ARIA 콤보박스.
 * 검색어는 300ms 뒤에 요청하고 이전 결과를 유지해 목록이 깜빡이지 않는다.
 */
function StorySearch({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string;
  onSelect: (story: Story) => void;
  onClose: (restoreFocus: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const result = useApi<Page<Story>>(storySearchUrl(debounced), true, {
    placeholderData: keepPreviousData,
  });
  const items = result.data?.items ?? [];
  const current = Math.min(active, items.length - 1);
  const typing = normalizeSearch(query) !== debounced;
  // 디바운스 대기 중이거나 이전 결과가 남아 있으면 선택을 막아 엉뚱한 스토리가 붙지 않게 한다.
  const stale = typing || result.isPlaceholderData;

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(normalizeSearch(query)), 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) onClose(false);
    }

    document.addEventListener('pointerdown', outside);

    return () => document.removeEventListener('pointerdown', outside);
  }, [onClose]);

  useEffect(() => {
    if (current >= 0)
      document
        .getElementById(optionId(current))
        ?.scrollIntoView?.({ block: 'nearest' });
  });

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!items.length) return;

      const step = event.key === 'ArrowDown' ? 1 : -1;

      setActive((current + step + items.length) % items.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      if (!items.length) return;

      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : items.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();

      if (!stale && current >= 0) onSelect(items[current]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    }
  }

  const heading = debounced
    ? `‘${debounced}’ 검색 결과`
    : '채팅이 많은 공개 스토리';

  return (
    <div
      ref={root}
      className="overflow-hidden rounded-md border bg-card shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]">
      <div className="relative border-b">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={input}
          autoFocus
          role="combobox"
          aria-label="이동 대상 스토리 검색"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current >= 0 ? optionId(current) : undefined}
          value={query}
          maxLength={50}
          placeholder="제목, 소유자 닉네임 또는 스토리 ID로 검색"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={keyDown}
          className="h-12 w-full bg-transparent pr-11 pl-10 text-sm outline-none placeholder:text-foreground-faint"
        />
        {query ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              setQuery('');
              setActive(0);
              input.current?.focus();
            }}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <HugeiconsIcon icon={Cancel01Icon} size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="flex h-9 items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
        <span className="truncate font-medium">{heading}</span>
        <span aria-live="polite" className="shrink-0 tabular-nums">
          {typing || result.isFetching
            ? '검색 중…'
            : result.data
              ? `${number(result.data.totalElements)}개`
              : ''}
        </span>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="공개 스토리"
        aria-busy={result.isFetching}
        className={cn(
          'max-h-[28rem] overflow-y-auto border-t py-1 transition-opacity duration-150',
          result.isPlaceholderData && 'opacity-60',
        )}>
        {result.isPending ? (
          Array.from({ length: 6 }, (_, index) => (
            <li key={index} aria-hidden="true" className="grid gap-2 px-4 py-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </li>
          ))
        ) : result.isError && !result.data ? (
          <li
            role="presentation"
            className="grid justify-items-center gap-3 px-4 py-8 text-sm">
            <span>스토리 목록을 불러오지 못했습니다.</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void result.refetch()}>
              다시 시도
            </Button>
          </li>
        ) : items.length === 0 ? (
          <li
            role="presentation"
            className="px-4 py-8 text-center text-sm text-muted-foreground">
            {debounced
              ? `검색어 ‘${debounced}’에 맞는 공개 스토리가 없습니다.`
              : '공개 스토리가 없습니다.'}
          </li>
        ) : (
          items.map((story, index) => {
            const selected = story.storyId === selectedId;

            return (
              <li
                key={story.storyId}
                id={optionId(index)}
                role="option"
                aria-selected={index === current}
                onPointerMove={() => index !== current && setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => !stale && onSelect(story)}
                className={cn(
                  'mx-1 grid cursor-pointer gap-1 rounded-sm px-3 py-2.5',
                  index === current && 'bg-muted',
                )}>
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <span className="truncate">
                    <Highlight text={story.title} query={debounced} />
                  </span>
                  {selected ? (
                    <span className="shrink-0 text-xs font-normal text-primary-text">
                      선택됨
                    </span>
                  ) : null}
                </span>
                <StoryMeta story={story} query={debounced} />
              </li>
            );
          })
        )}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <span className="hidden sm:inline">
          <Key>↑</Key> <Key>↓</Key> 이동 <Key>Enter</Key> 선택 <Key>Esc</Key>{' '}
          닫기
        </span>
        <span>
          {result.data && result.data.totalElements > items.length
            ? `상위 ${items.length}개만 표시합니다. 검색어로 좁혀 주세요.`
            : '공개 스토리만 표시합니다.'}
        </span>
      </div>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border bg-card px-1 font-sans text-[11px]">
      {children}
    </kbd>
  );
}

/** 이동 대상 스토리 선택기. 선택 전, 검색 중, 선택 후 카드 세 상태를 오간다. */
export function StoryPicker({
  storyId,
  story,
  pending,
  problem,
  onRetry,
  onChange,
}: {
  storyId: string;
  story: Story | undefined;
  pending: boolean;
  problem: string;
  onRetry?: () => void;
  onChange: (story: Story | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const restore = useRef(false);

  useEffect(() => {
    if (open || !restore.current) return;

    restore.current = false;
    trigger.current?.focus();
  }, [open]);

  function close(restoreFocus: boolean) {
    restore.current = restoreFocus;
    setOpen(false);
  }

  if (open)
    return (
      <StorySearch
        selectedId={storyId}
        onClose={close}
        onSelect={(next) => {
          onChange(next);
          close(true);
        }}
      />
    );

  if (!storyId)
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-dashed p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={Link01Icon} size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-sm font-medium">이동 대상 없음</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            알림을 눌러도 특정 스토리로 이동하지 않고 웹 푸시는 마냑 첫 화면을
            엽니다. 딥링크가 없어 푸시 열람 수도 집계되지 않습니다.
          </p>
        </div>
        <Button
          ref={trigger}
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}>
          스토리 선택
        </Button>
      </div>
    );

  if (!story && pending)
    return (
      <div
        role="status"
        aria-label="선택한 스토리를 불러오는 중"
        className="grid gap-2 rounded-md border p-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        problem ? 'border-destructive/40 bg-destructive/[0.03]' : 'bg-card',
      )}>
      {story ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 text-base font-semibold tracking-tight break-words">
              {story.title}
            </p>
            {story.visibility === 'PUBLIC' && !story.deletedAt ? (
              <span className="inline-flex h-5 items-center rounded-sm border px-1.5 text-xs">
                공개
              </span>
            ) : null}
          </div>
          {story.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-foreground-secondary">
              {story.description}
            </p>
          ) : null}
          <StoryMeta story={story} className="mt-2" />
        </>
      ) : null}
      {problem ? (
        <p
          role="alert"
          className={cn(
            'flex items-start gap-2 text-sm text-destructive-deep',
            story && 'mt-3 border-t border-destructive/20 pt-3',
          )}>
          <HugeiconsIcon
            icon={Alert02Icon}
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          {problem}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          ref={trigger}
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}>
          변경
        </Button>
        <Button type="button" variant="ghost" onClick={() => onChange(null)}>
          선택 해제
        </Button>
        {onRetry ? (
          <Button type="button" variant="ghost" onClick={onRetry}>
            다시 시도
          </Button>
        ) : null}
        <a
          href={`/stories/${encodeURIComponent(storyId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-sm text-sm text-link underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          상세 보기
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            size={14}
            aria-hidden="true"
          />
          <span className="sr-only">(새 탭)</span>
        </a>
      </div>
    </div>
  );
}
