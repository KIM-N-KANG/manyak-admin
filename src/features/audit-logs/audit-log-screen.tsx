'use client';

import {
  DataTable,
  dateTime,
  DetailGrid,
  PageHeading,
  QueryState,
  TextLink,
} from '@/components/admin/data-ui';
import { ListFilterForm, SearchEmpty } from '@/components/admin/list-search';
import { PageNavigation } from '@/components/admin/page-navigation';
import { Card } from '@/components/ui/card';
import { auditChangeValues } from '@/features/audit-logs/change-values';
import type { AuditLog } from '@/features/audit-logs/types';
import { useManagementList } from '@/features/management/use-management-list';
import { useApi } from '@/features/shared/use-api';

export function AuditLogListScreen() {
  const { query, params, sort, order, href, changeSort } =
    useManagementList<AuditLog>('/api/audit-logs');

  return (
    <>
      <PageHeading title="감사 로그" />
      <ListFilterForm label="처리자·작업·사유 검색">
        {(
          [
            ['adminId', '처리자 회원 ID'],
            ['action', '작업 이름'],
            ['targetType', '대상 종류'],
            ['targetId', '대상 ID'],
            ['from', '시작일'],
            ['to', '종료일'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-2 text-sm">
            {label}
            <input
              name={key}
              defaultValue={params.get(key) ?? ''}
              type={key === 'from' || key === 'to' ? 'date' : 'text'}
              className="control"
            />
          </label>
        ))}
      </ListFilterForm>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data ? (
        <>
          <DataTable
            headers={[
              { label: '처리자', key: 'admin' },
              { label: '작업 분류', key: 'category' },
              { label: '작업 이름', key: 'action' },
              { label: '대상 종류', key: 'targetType' },
              '사유',
              { label: '시각', key: 'createdAt' },
            ]}
            sorting={{ key: sort, order, onSort: changeSort }}
            empty={!query.data.items.length}
            emptyContent={params.get('q') ? <SearchEmpty /> : undefined}>
            {query.data.items.map((i) => (
              <tr key={i.auditLogId}>
                <td>{i.admin.nickname}</td>
                <td>{i.category === 'CHANGE' ? '변경' : '조회'}</td>
                <td>
                  <TextLink href={`/audit-logs/${i.auditLogId}`}>
                    {i.action}
                  </TextLink>
                </td>
                <td>
                  {i.targetType}
                  <span className="block text-xs text-muted-foreground">
                    {i.targetId}
                  </span>
                </td>
                <td>{i.reason ?? '—'}</td>
                <td>{dateTime(i.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
          <PageNavigation data={query.data} href={href} />
        </>
      ) : null}
    </>
  );
}
export function AuditLogDetailScreen({ id }: { id: string }) {
  const query = useApi<AuditLog>(`/api/audit-logs/${id}`);
  const item = query.data;
  const changes = item ? auditChangeValues(item) : null;

  return (
    <>
      <PageHeading title="감사 로그 상세">
        <TextLink href="/audit-logs">목록으로</TextLink>
      </PageHeading>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {item ? (
        <>
          <Card>
            <DetailGrid
              items={[
                ['처리자', item.admin.nickname],
                ['작업 분류', item.category],
                ['작업 이름', item.action],
                ['대상 종류', `${item.targetType} · ${item.targetId}`],
                ['사유', item.reason ?? '—'],
                ['시각', dateTime(item.createdAt)],
                ['요청 ID', item.requestId],
              ]}
            />
          </Card>
          {changes ? (
            <section className="mt-6" aria-label="변경 값">
              <DataTable
                headers={['항목', '변경 전', '변경 후']}
                empty={!changes.rows.length}
                emptyContent="표시할 변경 항목이 없습니다.">
                {changes.rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    <td>{row.before}</td>
                    <td>{row.after}</td>
                  </tr>
                ))}
              </DataTable>
              <p className="mt-3 text-sm text-muted-foreground">
                표시하지 않은 항목: 변경 전 {changes.hiddenBefore}개 · 변경 후{' '}
                {changes.hiddenAfter}개
              </p>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
