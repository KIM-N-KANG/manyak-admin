import { getDashboardCharts } from '@/fixtures/dashboard';

export function GET(request: Request) {
  const days = Number(new URL(request.url).searchParams.get('days') ?? '30');

  if (![7, 30, 90].includes(days))
    return Response.json(
      { message: '기간은 7, 30, 90일 중 선택하세요.' },
      { status: 400 },
    );

  return Response.json(getDashboardCharts(days));
}
