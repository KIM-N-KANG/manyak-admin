export const adminLoginPath = '/api/v1/admin/auth/login/google';

/** PR #353 기준의 서버 구현 상태와 BFF 경로 대응이다. */
export const adminEndpoints = [
  {
    browser: '/dashboard/summary',
    server: '/dashboard/summary',
    methods: ['GET'],
  },
  {
    browser: '/dashboard/charts',
    server: '/dashboard/charts',
    methods: ['GET'],
  },
  {
    browser: '/dashboard/analytics',
    server: '/dashboard/analytics',
    methods: ['GET'],
  },
  { browser: '/stories', server: '/stories', methods: ['GET'] },
  { browser: '/stories/:id', server: '/stories/:id', methods: ['GET'] },
  { browser: '/chats', server: '/chats', methods: ['GET'] },
  { browser: '/chats/:id', server: '/chats/:id', methods: ['GET'] },
  { browser: '/members', server: '/members', methods: ['GET'] },
  { browser: '/members/:id', server: '/members/:id', methods: ['GET'] },
  {
    browser: '/members/:id/transactions',
    server: '/members/:id/transactions',
    methods: ['GET'],
  },
  {
    browser: '/members/:id/attendance',
    server: '/members/:id/attendance',
    methods: ['GET'],
  },
  { browser: '/payments', server: '/payments/orders', methods: ['GET'] },
  {
    browser: '/payments/:id',
    server: '/payments/orders/:id',
    methods: ['GET'],
  },
  { browser: '/audit-logs', server: '/audit-logs', methods: ['GET'] },
  { browser: '/audit-logs/:id', server: null, methods: ['GET'] },
  { browser: '/originals/catalog', server: null, methods: ['GET'] },
  { browser: '/originals', server: '/originals', methods: ['GET', 'POST'] },
  {
    browser: '/originals/:id',
    server: '/originals/:id',
    methods: ['GET', 'PATCH'],
  },
  {
    browser: '/originals/:id/thumbnail',
    server: '/originals/:id/thumbnail',
    methods: ['DELETE'],
  },
  {
    browser: '/originals/images/presign',
    server: '/originals/images/presign',
    methods: ['POST'],
  },
  {
    browser: '/originals/:id/images/presign',
    server: '/originals/:id/images/presign',
    methods: ['POST'],
  },
  {
    browser: '/originals/images/:id',
    server: null,
    methods: ['GET', 'PUT'],
  },
  { browser: '/notices', server: '/notices', methods: ['GET', 'POST'] },
  {
    browser: '/notices/:id',
    server: '/notices/:id',
    methods: ['GET', 'PATCH', 'DELETE'],
  },
  {
    browser: '/notices/:id/publish',
    server: '/notices/:id/publish',
    methods: ['POST'],
  },
  {
    browser: '/notices/:id/unpublish',
    server: '/notices/:id/unpublish',
    methods: ['POST'],
  },
  {
    browser: '/notifications/campaigns/target-count',
    server: '/push/campaigns/target-count',
    methods: ['GET'],
  },
  {
    browser: '/notifications/campaigns',
    server: '/push/campaigns',
    methods: ['GET', 'POST'],
  },
  {
    browser: '/notifications/campaigns/:id',
    server: '/push/campaigns/:id',
    methods: ['GET'],
  },
  {
    browser: '/notifications/campaigns/:id/cancel',
    server: '/push/campaigns/:id/cancel',
    methods: ['POST'],
  },
  {
    browser: '/notifications/campaigns/:id/retry',
    server: '/push/campaigns/:id/retry',
    methods: ['POST'],
  },
  {
    browser: '/notifications/templates/:id',
    server: '/push/templates/:id',
    methods: ['GET', 'PUT', 'DELETE'],
  },
  {
    browser: '/notifications/delivery-stats',
    server: '/push/delivery-stats',
    methods: ['GET'],
  },
] as const;

export function findAdminEndpoint(path: string, method: string) {
  const endpoint = adminEndpoints.find(
    (entry) =>
      (entry.methods as readonly string[]).includes(method) &&
      new RegExp(`^${entry.browser.replaceAll(':id', '[^/]+')}$`).test(path),
  );

  if (!endpoint) return null;

  const values = path.split('/');
  const server = endpoint.server
    ?.split('/')
    .map((part) =>
      part === ':id'
        ? values[endpoint.browser.split('/').indexOf(':id')]
        : part,
    )
    .join('/');

  return {
    serverPath: server ? `/api/v1/admin${server}` : null,
    implemented: false,
  };
}
