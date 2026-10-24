export const skeletonDelayMs = 200;
export const skeletonMinimumMs = 300;

/** 표시한 초기 로딩을 최소 시간까지 유지한다. */
export async function finishInitialLoading(
  startedAt: number,
  initial: boolean,
  signal: AbortSignal,
) {
  if (!initial || signal.aborted) return;

  const elapsed = performance.now() - startedAt;

  if (elapsed < skeletonDelayMs) return;

  const remaining = skeletonDelayMs + skeletonMinimumMs - elapsed;

  if (remaining > 0)
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}
