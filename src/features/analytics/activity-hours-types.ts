import type { z } from 'zod';

import type { ActivityHoursResponse as ActivityHoursSchema } from '@/api/generated/zod/admin';

export type ActivityHoursResponse = z.infer<typeof ActivityHoursSchema>;
export type HoursMetric = keyof ActivityHoursResponse['metrics'];
export type ActivityHoursMetric = ActivityHoursResponse['metrics'][HoursMetric];
