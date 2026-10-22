import { OriginalFormScreen } from '@/features/originals/original-form-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OriginalFormScreen id={id} />;
}
