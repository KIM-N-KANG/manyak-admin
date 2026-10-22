/** Orval이 요청 바디에 사용하는 타입이다. */
export type BodyType<BodyData> = BodyData;

/** 실패한 HTTP 응답의 상태와 본문을 보관한다. */
export class FetchError<ErrorData = unknown> extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: ErrorData,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export type ErrorType<ErrorData> = FetchError<ErrorData>;

/** 생성된 URL을 동일 출처의 Next route handler 경로로 변환한다. */
export function resolveApiProxyUrl(url: string) {
  const resolvedUrl = /^https?:\/\//.test(url)
    ? new URL(url).pathname + new URL(url).search
    : url;
  const normalizedUrl = resolvedUrl.startsWith('/')
    ? resolvedUrl
    : `/${resolvedUrl}`;

  if (
    normalizedUrl === '/api' ||
    normalizedUrl.startsWith('/api/') ||
    normalizedUrl.startsWith('/api?')
  ) {
    return normalizedUrl;
  }

  return `/api${normalizedUrl}`;
}

async function parseResponseData(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
    return response.body;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** BFF에 쿠키를 전달하고 Orval의 { data, status, headers } 응답을 반환한다. */
export async function customInstance<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(resolveApiProxyUrl(url), {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  const data = await parseResponseData(response);

  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    window.location.pathname !== '/login'
  ) {
    window.location.replace('/login');
  }

  if (!response.ok) {
    throw new FetchError('요청 처리에 실패했습니다.', response.status, data);
  }

  return { data, status: response.status, headers: response.headers } as T;
}
