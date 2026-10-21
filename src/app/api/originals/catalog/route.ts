import { originalGenres } from '@/fixtures/original-genres';

export function GET() {
  return Response.json({ genres: originalGenres });
}
