import { type NextConfig } from 'next';

import { version } from './package.json';

const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 사이드바 버전 표시용 공개 값이다. 빌드 시점에 클라이언트 번들에 들어간다.
  env: {
    APP_VERSION_LABEL: [`v${version}`, commit].filter(Boolean).join(' · '),
  },
};

export default nextConfig;
