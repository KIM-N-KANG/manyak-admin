export function bffError(
  request: Request,
  status: 400 | 404 | 409,
  message: string,
  field?: string,
) {
  return Response.json(
    {
      timestamp: new Date().toISOString(),
      status,
      code: { 400: 'BAD_REQUEST', 404: 'NOT_FOUND', 409: 'CONFLICT' }[status],
      message,
      path: new URL(request.url).pathname,
      details: field ? [{ field, message }] : [],
    },
    { status },
  );
}
