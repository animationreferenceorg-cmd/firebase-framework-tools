import type {
  ArefCategory,
  ArefErrorCode,
  ArefHandoff,
  ArefPage,
  ArefStatus,
  ArefTagSummary,
  ArefVideo,
  ArefVideoDetail,
  ArefVideoQuery,
} from './types';

/**
 * Client for the Animation Reference Partner API.
 *
 * Zero dependencies, uses global fetch (Node 18+, Bun, Deno, edge runtimes).
 *
 * SERVER SIDE ONLY. The API key identifies your organisation; putting it in
 * browser code hands it to anyone who opens devtools. Proxy through your own
 * backend if the browser needs this data.
 */

export interface ArefClientOptions {
  apiKey: string;
  /** Defaults to https://animationreference.org/api/v1 */
  baseUrl?: string;
  /** Per-request timeout in ms. Default 10000. */
  timeoutMs?: number;
  /** Retries on 429 and 5xx, with backoff. Default 2. */
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
}

export class ArefApiError extends Error {
  constructor(
    public status: number,
    public code: ArefErrorCode | string,
    message: string,
    /** Seconds to wait, when the server sent Retry-After. */
    public retryAfter?: number,
  ) {
    super(`[${status} ${code}] ${message}`);
    this.name = 'ArefApiError';
  }

  /** True when retrying the identical request could plausibly succeed. */
  get isTransient(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const DEFAULT_BASE_URL = 'https://animationreference.org/api/v1';

export class ArefClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: ArefClientOptions) {
    if (!options.apiKey) {
      throw new Error('ArefClient: apiKey is required. Set AREF_API_KEY in your environment.');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetch || globalThis.fetch;
  }

  /** Confirms the key works and reports its scopes and rate limit. */
  status(): Promise<ArefStatus> {
    return this.request<{ data: ArefStatus }>('GET', '/status').then((body) => body.data);
  }

  /** One page of videos. Use listAllVideos() to walk every page. */
  listVideos(query: ArefVideoQuery = {}): Promise<ArefPage<ArefVideo>> {
    return this.request<ArefPage<ArefVideo>>('GET', '/videos', query as Record<string, unknown>);
  }

  /**
   * Every video matching the query, one page at a time.
   *
   *   for await (const video of client.listAllVideos({ tag: 'combat' })) { ... }
   *
   * Prefer this over raising `limit` - it paginates correctly and keeps each
   * response small enough to stay well inside your rate limit.
   */
  async *listAllVideos(query: ArefVideoQuery = {}): AsyncGenerator<ArefVideo> {
    let cursor: string | null = query.cursor ?? null;
    do {
      const page: ArefPage<ArefVideo> = await this.listVideos({ ...query, limit: query.limit ?? 50, cursor });
      for (const video of page.data) yield video;
      cursor = page.pagination.nextCursor;
    } while (cursor);
  }

  /** One video plus similar ones. `related` is 0-24, default 6. */
  getVideo(id: string, options: { related?: number } = {}): Promise<ArefVideoDetail> {
    return this.request<ArefVideoDetail>('GET', `/videos/${encodeURIComponent(id)}`, options);
  }

  listCategories(): Promise<ArefCategory[]> {
    return this.request<{ data: ArefCategory[] }>('GET', '/categories').then((body) => body.data);
  }

  listTags(options: { q?: string; limit?: number; cursor?: string | null } = {}): Promise<ArefPage<ArefTagSummary>> {
    return this.request<ArefPage<ArefTagSummary>>('GET', '/tags', options as Record<string, unknown>);
  }

  /**
   * Redeems a handoff token: a user on animationreference.org clicked "send to
   * Anim.works" and their browser arrived at your import URL carrying ?token=.
   *
   * Single use, valid five minutes, redeemable only by the key it was minted
   * for. Call this once, server side, then load the returned video.
   */
  redeemHandoff(token: string): Promise<ArefHandoff> {
    return this.request<{ data: ArefHandoff }>('POST', '/handoff/exchange', undefined, { token }).then((body) => body.data);
  }

  // ---- transport ----------------------------------------------------------

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    query?: Record<string, unknown>,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }

    let lastError: ArefApiError | Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(backoffMs(attempt, lastError));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchImpl(url, {
          method,
          headers: {
            'X-API-Key': this.apiKey,
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (response.ok) return (await response.json()) as T;

        const payload = (await response.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string; retryAfter?: number };
        };
        const error = new ArefApiError(
          response.status,
          payload.error?.code || 'UNKNOWN',
          payload.error?.message || response.statusText,
          payload.error?.retryAfter ?? numberOrUndefined(response.headers.get('Retry-After')),
        );

        // 4xx other than 429 will fail identically on retry.
        if (!error.isTransient) throw error;
        lastError = error;
      } catch (error) {
        if (error instanceof ArefApiError) {
          if (!error.isTransient) throw error;
          lastError = error;
        } else {
          // Network failure or timeout - worth another attempt.
          lastError = error as Error;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new Error('ArefClient: request failed');
  }
}

function backoffMs(attempt: number, lastError?: ArefApiError | Error): number {
  if (lastError instanceof ArefApiError && lastError.retryAfter) {
    return Math.min(lastError.retryAfter * 1000, 30_000);
  }
  // 500ms, 1s, 2s ... plus jitter so parallel clients do not resynchronise.
  return Math.min(500 * 2 ** (attempt - 1), 8_000) + Math.random() * 250;
}

function numberOrUndefined(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
