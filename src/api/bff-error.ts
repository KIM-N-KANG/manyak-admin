export function bffError(
  request: Request,
  status: 400 | 404,
  message: string,
  field?: string,
) {
  return Response.json(
    {
      timestamp: new Date().toISOString(),
      status,
      code: status === 400 ? 'BAD_REQUEST' : 'NOT_FOUND',
      message,
      path: new URL(request.url).pathname,
      details: field ? [{ field, message }] : [],
    },
    { status },
  );
}
