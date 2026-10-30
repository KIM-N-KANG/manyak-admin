import { adminOperations } from '@/api/generated/admin-operations';

export const adminLoginPath = '/api/v1/admin/auth/login/google';

const aliases: Record<string, string> = {
  '/payments/orders': '/payments',
  '/push/campaigns': '/notifications/campaigns',
  '/push/templates': '/notifications/templates',
  '/push/delivery-stats': '/notifications/delivery-stats',
};

function browserPath(path: string) {
  const local = path.replace('/api/v1/admin', '');

  if (local === '/chat-models') return '/credits/promotions';

  if (local === '/chat-models/{code}/promotion')
    return '/credits/promotions/:id';

  const alias = Object.entries(aliases).find(
    ([prefix]) => local === prefix || local.startsWith(`${prefix}/`),
  );

  return (alias ? local.replace(alias[0], alias[1]) : local).replace(
    /\{[^}]+\}/g,
    ':id',
  );
}

interface AdminEndpoint {
  browser: string;
  server: string | null;
  methods: string[];
  implemented: boolean;
  operation?: (typeof adminOperations)[number];
}

export const adminEndpoints: AdminEndpoint[] = [
  ...adminOperations
    .filter((operation) => operation.path !== adminLoginPath)
    .map((operation) => ({
      browser: browserPath(operation.path),
      server: operation.path
        .replace('/api/v1/admin', '')
        .replace(/\{[^}]+\}/g, ':id'),
      methods: [operation.method],
      implemented: true,
      operation,
    })),
  // OpenAPI 배포 뒤 생성 연산이 같은 경로를 먼저 연결한다.
  {
    browser: '/credits/promotions',
    server: '/chat-models',
    methods: ['GET'],
    implemented: false,
  },
  {
    browser: '/credits/promotions/:id',
    server: '/chat-models/:id/promotion',
    methods: ['PUT', 'DELETE'],
    implemented: false,
  },
  ...['/audit-logs/:id', '/originals/catalog', '/originals/images/:id'].map(
    (browser) => ({
      browser,
      server: null,
      methods: browser.includes('/images/') ? ['GET', 'PUT'] : ['GET'],
      implemented: false,
    }),
  ),
];

export function findAdminEndpoint(path: string, method: string) {
  // 정적 경로를 먼저 찾아 target-count와 catalog가 식별자로 해석되지 않게 한다.
  const endpoint = [...adminEndpoints]
    .sort(
      (a, b) =>
        Number(a.browser.includes(':id')) - Number(b.browser.includes(':id')),
    )
    .find(
      (entry) =>
        entry.methods.includes(method) &&
        new RegExp(`^${entry.browser.replaceAll(':id', '[^/]+')}$`).test(path),
    );

  if (!endpoint) return null;

  const value = path.split('/')[endpoint.browser.split('/').indexOf(':id')];
  const server = endpoint.server?.replace(':id', () => value);

  return {
    serverPath: server ? `/api/v1/admin${server}` : null,
    implemented: endpoint.implemented,
    operation: endpoint.operation,
  };
}
