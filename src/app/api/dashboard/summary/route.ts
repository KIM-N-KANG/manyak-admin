import { summary } from '@/fixtures/dashboard';

export function GET() {
  return Response.json(summary);
}
