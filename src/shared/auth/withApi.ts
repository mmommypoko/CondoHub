import 'server-only';
import { NextResponse } from 'next/server';
import { AppError, toErrorEnvelope } from '@/shared/utils/errors';
import { childLogger } from '@/shared/observability/logger';
import {
  RATE_LIMIT_PRESETS,
  RETRY_AFTER_HEADER,
  retryAfterSeconds,
  sharedRateLimiter,
  type RateLimitBucket,
} from '@/shared/utils/rateLimit';
import { resolveRequestId, REQUEST_ID_HEADER } from '@/shared/observability/requestId';
import { getActorFromSession, type Actor } from './actor';
import { assertNoFirstLogin, requireActor } from './guards';

export interface ApiContext {
  actor: Actor;
  requestId: string;
}

export interface WithApiOptions {
  allowFirstLogin?: boolean;
  rateLimit?: RateLimitBucket;
  rateLimitKey?: (request: Request, actor: Actor | null) => string;
}

export const FIRST_LOGIN_ALLOWLIST = [
  'POST /api/auth/change-password',
  'POST /api/auth/sign-out',
  'GET /api/auth/session',
  'GET /api/health',
] as const;

function defaultRateLimitKey(request: Request, actor: Actor | null): string {
  if (actor !== null) return `user:${actor.userId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null && forwarded !== '') return `ip:${forwarded.split(',')[0]?.trim() ?? 'unknown'}`;
  return 'ip:unknown';
}

function rateLimitResponse(requestId: string, retryAfterMs: number): NextResponse {
  const envelope = toErrorEnvelope(new AppError('RATE_LIMITED'), requestId);
  const response = NextResponse.json(envelope, { status: 429 });
  response.headers.set(RETRY_AFTER_HEADER, String(retryAfterSeconds(retryAfterMs)));
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export function withApi<T>(
  handler: (request: Request, ctx: ApiContext) => Promise<T>,
  opts?: WithApiOptions,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const requestId = resolveRequestId(request.headers);
    const log = childLogger({ requestId });
    const startedAt = Date.now();
    try {
      const peeked = await getActorFromSession();
      const keyFn = opts?.rateLimitKey ?? defaultRateLimitKey;
      const verdict = sharedRateLimiter.consume(
        keyFn(request, peeked),
        opts?.rateLimit ?? RATE_LIMIT_PRESETS.generalApi ?? { capacity: 300, windowMs: 60_000 },
      );
      if (!verdict.allowed) return rateLimitResponse(requestId, verdict.retryAfterMs);
      const actor = requireActor(peeked);
      if (actor.accountStatus !== 'ACTIVE') throw new AppError('ACCESS_DENIED');
      if (opts?.allowFirstLogin !== true) assertNoFirstLogin(actor);
      const data = await handler(request, { actor, requestId });
      const response = NextResponse.json({ data });
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } catch (error) {
      const envelope = toErrorEnvelope(error, requestId);
      const status = error instanceof AppError ? error.httpStatus : 500;
      if (status >= 500) log.error({ err: error }, 'api error');
      const response = NextResponse.json(envelope, { status });
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } finally {
      log.info({ method: request.method, path: new URL(request.url).pathname, elapsedMs: Date.now() - startedAt }, 'api request');
    }
  };
}
