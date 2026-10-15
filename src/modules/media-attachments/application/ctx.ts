import 'server-only';
import type { Clock } from '@/shared/utils/clock';
import { systemClock } from '@/shared/utils/clock';

export interface MediaCtx {
  clock: Clock;
  requestId: string;
  isSeedActor: boolean;
}

export function createMediaCtx(input: {
  requestId: string;
  isSeedActor?: boolean;
}): MediaCtx {
  return {
    clock: systemClock,
    requestId: input.requestId,
    isSeedActor: input.isSeedActor ?? false,
  };
}
