import { creditPromotionsResponse } from '@/fixtures/credit-promotions';

export function GET(request: Request) {
  return creditPromotionsResponse(request);
}
