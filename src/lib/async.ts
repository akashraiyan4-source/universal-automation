/** Reject if `promise` does not settle within `ms`. Prevents hung upstreams from pinning a serverless function. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** `fetch` with a hard timeout (AbortController) for third-party HTTP calls. */
export async function fetchWithTimeout(input: string | URL, init: RequestInit = {}, ms = 8_000): Promise<Response> {
  const controller = new AbortController();
  const parent = init.signal;
  if (parent) {
    if (parent.aborted) controller.abort(parent.reason);
    else parent.addEventListener('abort', () => controller.abort(parent.reason), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Fetch timed out after ${ms}ms (${typeof input === 'string' ? input : input.toString()})`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Like `fetchWithTimeout`, but returns `null` on any failure instead of throwing. */
export async function fetchOk(input: string | URL, init: RequestInit = {}, ms = 8_000): Promise<Response | null> {
  try {
    const response = await fetchWithTimeout(input, init, ms);
    return response.ok ? response : null;
  } catch (error) {
    console.warn('[fetchOk]', error instanceof Error ? error.message : error);
    return null;
  }
}
