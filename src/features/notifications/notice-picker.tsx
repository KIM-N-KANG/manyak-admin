'use client';

import { useState } from 'react';

import { dateTime, QueryState } from '@/components/admin/data-ui';
import { Button } from '@/components/ui/button';
import { NoticeTagBadge } from '@/features/notices/notice-tag-badge';
import type { NoticeListItem } from '@/features/notices/types';
import { useApi } from '@/features/shared/use-api';

export function NoticePicker({
  notice,
  problem,
  pending,
  onRetry,
  onChange,
}: {
  notice: NoticeListItem | undefined;
  problem: string;
  pending: boolean;
  onRetry: () => void;
  onChange: (notice: NoticeListItem | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const query = useApi<{ items: NoticeListItem[] }>(
    `/api/notices?status=PUBLISHED&q=${encodeURIComponent(search)}`,
    !notice || searching,
  );
  const selecting = !notice || searching;

  return (
    <div className="grid gap-3">
      {notice ? (
        <div className="grid gap-3 rounded-md border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <NoticeTagBadge tag={notice.tag} />
            <p className="font-semibold">{notice.title}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {notice.publishedAt ? dateTime(notice.publishedAt) : ''}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearching(!searching)}>
              {searching ? '검색 닫기' : '변경'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(null);
                setSearching(false);
              }}>
              선택 해제
            </Button>
          </div>
        </div>
      ) : null}
      {problem ? (
        <div role="alert" className="grid gap-2 text-sm text-destructive">
          <p>{problem}</p>
          <Button type="button" variant="outline" onClick={onRetry}>
            다시 시도
          </Button>
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            선택 해제
          </Button>
        </div>
      ) : null}
      {pending ? (
        <p role="status" className="text-sm text-muted-foreground">
          공지를 확인하고 있습니다.
        </p>
      ) : null}
      {selecting ? (
        <>
          <label className="grid gap-2 text-sm">
            이동 대상 공지 검색
            <input
              className="control"
              value={search}
              maxLength={50}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={query.refetch}
          />
          {query.data ? (
            query.data.items.length ? (
              <ul
                aria-label="게시된 공지"
                className="max-h-80 divide-y overflow-y-auto rounded-md border">
                {query.data.items.map((item) => (
                  <li key={item.noticeId}>
                    <button
                      type="button"
                      className="grid w-full gap-2 p-4 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        onChange(item);
                        setSearching(false);
                      }}>
                      <span className="flex flex-wrap items-center gap-2">
                        <NoticeTagBadge tag={item.tag} />
                        <span>{item.title}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.publishedAt ? dateTime(item.publishedAt) : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                {search
                  ? '검색 조건에 맞는 공지가 없습니다.'
                  : '게시된 공지가 없습니다.'}
              </p>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}
