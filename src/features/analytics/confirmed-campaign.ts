import { FetchError } from '@/api/mutator/custom-instance';

import { isConfirmedDate } from './range';

const campaignPaths = [
  '/api/campaigns/funnels/activation',
  '/api/campaigns/reach',
  '/api/campaigns/funnels/creation',
  '/api/campaigns/funnels/story-detail',
];

export const confirmedUnavailableDescription =
  '지난 기간은 Amplitude 조회 한도 때문에 나눠 받아 처음 볼 때 몇 분 걸릴 수 있습니다. 60초 뒤 다시 요청합니다.';

export function campaignRangePolicy(url: string) {
  const parsed = new URL(url, 'http://localhost');
  const supported = campaignPaths.includes(parsed.pathname);

  return {
    supported,
    confirmed:
      supported && isConfirmedDate(parsed.searchParams.get('to') ?? ''),
  };
}

export function retryableCampaignError(error: unknown) {
  return (
    error instanceof FetchError &&
    error.status === 503 &&
    !(
      typeof error.data === 'object' &&
      error.data !== null &&
      'message' in error.data &&
      error.data.message === '서버 미구현'
    )
  );
}
