import { expect, test } from '@playwright/test';
import { apiJson } from '../../helpers/api';
import { readRunContext, workerNamespace } from '../../fixtures/run-context';
import { loginAsPoolAdmin } from '../../helpers/owner';
import { buildFakeImage, buildValidImage } from '../../helpers/announcementFiles';

interface IntentEnvelope {
  data: { imageId: string; uploadUrl: string; expiresAt: string };
}

interface CompleteEnvelope {
  data: {
    imageId: string;
    state: string;
    scope: string;
    byteSize: number;
    mimeVerified: string;
  };
}

interface AccessEnvelope {
  data: { url: string; expiresAt: string };
}

interface AnnouncementEnvelope {
  data: { id: string; images: Array<{ id: string }> };
}

async function putBytes(uploadUrl: string, contentType: string, bytes: Buffer): Promise<number> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: new Uint8Array(bytes),
  });
  return response.status;
}

test.describe('announcement images: intent, upload, complete, attach, access', () => {
  test.setTimeout(180000);

  test('valid image attaches to a published announcement and serves a signed url', async ({
    page,
  }, testInfo) => {
    const { runId } = await readRunContext();
    const ns = workerNamespace(runId, testInfo.workerIndex);
    await loginAsPoolAdmin(page, 'images');

    const created = await apiJson<AnnouncementEnvelope>(page.request, {
      method: 'POST',
      path: '/api/admin/announcements',
      body: {
        title: `E2E-${ns} image notice`,
        body: `Image body ${ns}.`,
        publishAt: new Date(Date.now() - 1000).toISOString(),
        imageIds: [],
      },
    });
    expect(created.status).toBe(200);
    const announcementId = created.json.data.id;

    const fixture = await buildValidImage('png');
    const intent = await apiJson<IntentEnvelope>(page.request, {
      method: 'POST',
      path: '/api/images/intents',
      body: {
        scope: 'ANNOUNCEMENT',
        entityRef: { type: 'announcement', id: null },
        contentType: fixture.contentType,
        fileName: `e2e-${ns}.png`,
      },
    });
    expect(intent.status).toBe(200);
    expect(intent.json.data.uploadUrl).toContain('http');

    const putStatus = await putBytes(intent.json.data.uploadUrl, fixture.contentType, fixture.bytes);
    expect(putStatus).toBeLessThan(300);

    const completed = await apiJson<CompleteEnvelope>(page.request, {
      method: 'POST',
      path: `/api/images/${intent.json.data.imageId}/complete`,
      body: {},
    });
    expect(completed.status).toBe(200);
    expect(completed.json.data.state).toBe('READY');
    expect(completed.json.data.mimeVerified).toBe('image/png');

    const attached = await apiJson<AnnouncementEnvelope>(page.request, {
      method: 'PATCH',
      path: `/api/admin/announcements/${announcementId}`,
      body: { imageIds: [intent.json.data.imageId] },
    });
    expect(attached.status).toBe(200);
    expect(attached.json.data.images.map((image) => image.id)).toContain(
      intent.json.data.imageId,
    );

    const access = await apiJson<AccessEnvelope>(page.request, {
      method: 'GET',
      path: `/api/images/${intent.json.data.imageId}/access`,
    });
    expect(access.status).toBe(200);
    expect(access.json.data.url).toContain('http');

    await page.goto(`/announcements/${announcementId}`);
    await expect(page.getByTestId('announcement-detail-image-0')).toBeVisible({ timeout: 15000 });
  });

  test('fake image bytes are rejected before READY', async ({ page }, testInfo) => {
    const { runId } = await readRunContext();
    const ns = workerNamespace(runId, testInfo.workerIndex);
    await loginAsPoolAdmin(page, 'images');

    const fixture = buildFakeImage();
    const intent = await apiJson<IntentEnvelope>(page.request, {
      method: 'POST',
      path: '/api/images/intents',
      body: {
        scope: 'ANNOUNCEMENT',
        entityRef: { type: 'announcement', id: null },
        contentType: fixture.contentType,
        fileName: `e2e-${ns}-fake.jpg`,
      },
    });
    expect(intent.status).toBe(200);

    const putStatus = await putBytes(intent.json.data.uploadUrl, fixture.contentType, fixture.bytes);
    expect(putStatus).toBeLessThan(300);

    const completed = await apiJson<unknown>(page.request, {
      method: 'POST',
      path: `/api/images/${intent.json.data.imageId}/complete`,
      body: {},
    });
    expect([400, 413]).toContain(completed.status);
  });
});
