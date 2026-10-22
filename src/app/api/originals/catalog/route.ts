import { productionDataSourceError } from '@/api/data-source-guard';
import { originalGenres } from '@/fixtures/original-genres';

const featured = [
  '계약결혼',
  '괴담',
  '로맨스판타지',
  '먼치킨',
  '복수',
  '빙의',
  '삼각관계',
  '아포칼립스',
  '현대판타지',
  '역하렘',
  '집착',
  '헌터물',
  'BL',
  '회귀',
  '탈출',
];

export function GET() {
  const configurationError = productionDataSourceError();

  if (configurationError) return configurationError;

  const genres = originalGenres.map((name, index) => ({ id: index + 1, name }));

  return Response.json({
    genres,
    featuredGenres: featured.map(
      (name) => genres.find((genre) => genre.name === name)!,
    ),
  });
}
