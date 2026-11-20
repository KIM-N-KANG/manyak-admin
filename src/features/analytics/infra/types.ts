import type { z } from 'zod';

import type {
  Metrics2Response,
  TablesResponse,
} from '@/api/generated/zod/admin';

// 서버 Kotlin DTO의 필수 필드는 유지하고 환경별 null 묶음은 보존한다.
type Complete<T> = T extends (infer Item)[]
  ? Complete<Item>[]
  : T extends object
    ? { [Key in keyof T]-?: Complete<T[Key]> }
    : T;

export type InfraMetrics = Complete<z.infer<typeof Metrics2Response>>;
export type InfraTables = Complete<z.infer<typeof TablesResponse>>;
export type InfraPoint = NonNullable<
  InfraMetrics['requests']
>['requests'][number];
// 응답 묶음 키(BACKEND 4-2-34). 묶음이 null이면 unavailable 포함 여부로 문구를 가른다(WEB 4-1).
export type InfraBundle =
  | 'host'
  | 'hostSystem'
  | 'requests'
  | 'rds'
  | 'redis'
  | 'opensearch';
export type InfraSeries = {
  key: string;
  label: string;
  points: InfraPoint[];
  // 툴팁과 수치 표에 "{값} / {짝 값}"으로 함께 보이는 값이다. CPU는 최대, 디스크는 크기다.
  maxPoints?: InfraPoint[];
  pairLabel?: string;
  color: string;
  dash?: string;
};
export type InfraUnit = '%' | 'GB' | 'MB' | 'ms' | '개' | '회' | '크레딧';
