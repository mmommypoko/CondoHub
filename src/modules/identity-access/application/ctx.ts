import 'server-only';
import type { Clock } from '@/shared/utils/clock';
import { systemClock } from '@/shared/utils/clock';
import type { TempPasswordGenerator } from '@/modules/identity-access/infrastructure/tempPassword';
import { tempPasswordGenerator } from '@/modules/identity-access/infrastructure/tempPassword';

export interface IdentityCtx {
  clock: Clock;
  requestId: string;
  isSeedActor: boolean;
  tempPasswords: TempPasswordGenerator;
}

export function createIdentityCtx(input: { requestId: string; isSeedActor?: boolean }): IdentityCtx {
  return {
    clock: systemClock,
    requestId: input.requestId,
    isSeedActor: input.isSeedActor ?? false,
    tempPasswords: tempPasswordGenerator,
  };
}
