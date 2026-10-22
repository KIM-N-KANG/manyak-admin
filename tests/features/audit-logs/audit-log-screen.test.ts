// @vitest-environment jsdom
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { AuditLogDetailScreen } from '@/features/audit-logs/audit-log-screen';
import { auditLogs } from '@/fixtures/audit-logs';

afterEach(cleanup);
it('변경 값을 비교 표로 표시하고 숨긴 키·값과 이메일 원문을 DOM에 노출하지 않는다', () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity } },
  });
  const item = {
    ...auditLogs[1],
    before: { balance: 1230, privateField: 'hidden@example.test' },
    after: {
      balance: 'visible@example.test',
      amount: 5000,
      privateField: '비공개 값',
    },
  };

  client.setQueryData([`/api/audit-logs/${item.auditLogId}`], item);

  const view = render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuditLogDetailScreen, { id: item.auditLogId }),
    ),
  );
  const table = screen.getByRole('table');

  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent),
  ).toEqual(['항목', '변경 전', '변경 후']);
  expect(within(table).getByText('***@***')).toBeTruthy();
  expect(view.container.textContent).not.toMatch(
    /privateField|hidden@example.test|visible@example.test|비공개 값/,
  );
  expect(view.container.textContent).toContain(
    '표시하지 않은 항목: 변경 전 1개 · 변경 후 1개',
  );
  expect(view.container.querySelector('pre')).toBeNull();
  client.clear();
});
