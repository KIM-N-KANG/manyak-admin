'use client';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { customInstance, FetchError } from '@/api/mutator/custom-instance';

export function useManagementMutation() {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function run<T>(
    url: string,
    method: string,
    body: unknown,
  ): Promise<T | undefined> {
    setPending(true);
    setError('');

    try {
      const result = await customInstance<{ data: T }>(url, {
        method,
        body: JSON.stringify(body),
      });

      await client.invalidateQueries();

      return (result.data ?? { deleted: true }) as T;
    } catch (e) {
      setError(
        e instanceof FetchError &&
          e.data &&
          typeof e.data === 'object' &&
          'message' in e.data
          ? String(e.data.message)
          : '요청에 실패했습니다. 입력을 유지했으니 다시 시도하세요.',
      );

      return undefined;
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run, setError };
}
