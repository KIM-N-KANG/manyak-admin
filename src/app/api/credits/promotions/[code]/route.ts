import { creditPromotionsResponse } from '@/fixtures/credit-promotions';

async function handle(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;

  return creditPromotionsResponse(request, code);
}

export { handle as PUT, handle as DELETE };
