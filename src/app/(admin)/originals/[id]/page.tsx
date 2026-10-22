import { OriginalDetailScreen } from '@/features/originals/original-detail-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OriginalDetailScreen id={id} />;
}
