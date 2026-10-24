import './globals.css';

import { type Metadata } from 'next';
import localFont from 'next/font/local';

import { LoadingBoundary } from '@/components/admin/loading-boundary';
import { ShellSkeleton } from '@/components/admin/loading-ui';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';

const pretendard = localFont({
  src: '../assets/fonts/pretendard/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '마냑 관리자',
  description: '마냑 관리자 페이지',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="font-sans antialiased">
        <QueryProvider>
          <LoadingBoundary fallback={<ShellSkeleton />}>
            {children}
          </LoadingBoundary>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
