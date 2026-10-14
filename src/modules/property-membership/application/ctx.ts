import 'server-only';
import type { Clock } from '@/shared/utils/clock';
import { systemClock } from '@/shared/utils/clock';

export interface PropertyCtx {
  clock: Clock;
  requestId: string;
  isSeedActor: boolean;
}

export function createPropertyCtx(input: { requestId: string; isSeedActor?: boolean }): PropertyCtx {
  return {
    clock: systemClock,
    requestId: input.requestId,
    isSeedActor: input.isSeedActor ?? false,
  };
}
