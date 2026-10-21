import { deliveryStats } from '@/fixtures/notifications';
import { fixtureResponse } from '@/fixtures/query';

export function GET(request: Request) {
  return fixtureResponse(request, deliveryStats);
}
