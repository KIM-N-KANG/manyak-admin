import type { z } from 'zod';

import type {
  MetricsResponse,
  TablesResponse,
} from '@/api/generated/zod/admin';

// 서버 Kotlin DTO의 필수 필드는 유지하고 환경별 null 묶음은 보존한다.
type Complete<T> = T extends (infer Item)[]
  ? Complete<Item>[]
  : T extends object
    ? { [Key in keyof T]-?: Complete<T[Key]> }
    : T;

export type InfraMetrics = Complete<z.infer<typeof MetricsResponse>>;
export type InfraTables = Complete<z.infer<typeof TablesResponse>>;
export type InfraPoint = NonNullable<InfraMetrics['alb']>['requests'][number];
export type InfraSeries = {
  key: string;
  label: string;
  points: InfraPoint[];
  color: string;
  dash?: string;
};
export type InfraUnit = '%' | 'GB' | 'MB' | 'ms' | '개' | '회';
