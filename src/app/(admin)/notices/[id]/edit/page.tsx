import { NoticeFormScreen } from '@/features/notices/notice-form-screen';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <NoticeFormScreen id={id} />;
}
