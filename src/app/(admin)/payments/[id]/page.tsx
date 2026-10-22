import { DetailScreen } from '@/features/shared/detail-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DetailScreen domain="payments" id={id} />;
}
