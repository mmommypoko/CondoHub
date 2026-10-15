import { expect, test } from '@playwright/test';
import { apiJson } from '../../helpers/api';
import { readRunContext, workerNamespace } from '../../fixtures/run-context';
import { loginAsPoolAdmin } from '../../helpers/owner';
import { mintIntent } from './uploadFlow';

const FAKE_SCOPES = ['PAYMENT_SLIP', 'PAYMENT_QR', 'MAINTENANCE', 'CHAT'] as const;

test.describe('upload scope gates: fake callbacks deny until owner slices land', () => {
  test.setTimeout(180000);

  for (const scope of FAKE_SCOPES) {
    test(`${scope} intent minting is denied with SCOPE_ACL_NOT_IMPLEMENTED closed`, async ({
      page,
    }, testInfo) => {
      const { runId } = await readRunContext();
      const ns = workerNamespace(runId, testInfo.workerIndex);
      await loginAsPoolAdmin(page, 'scopeGates');

      const intent = await mintIntent(page.request, {
        scope,
        entityRef: { type: 'owner', id: null },
        contentType: 'image/png',
        fileName: `e2e-${ns}-fake.png`,
      });
      expect(intent.status).toBe(403);
    });
  }

  test('unknown scope is rejected by the route schema', async ({ page }, testInfo) => {
    const { runId } = await readRunContext();
    const ns = workerNamespace(runId, testInfo.workerIndex);
    await loginAsPoolAdmin(page, 'scopeGates');

    const response = await apiJson<unknown>(page.request, {
      method: 'POST',
      path: '/api/images/intents',
      body: {
        scope: 'ROOM_AVATAR',
        entityRef: { type: 'owner', id: null },
        contentType: 'image/png',
        fileName: `e2e-${ns}-spoof.png`,
      },
    });
    expect(response.status).toBe(400);
  });
});
