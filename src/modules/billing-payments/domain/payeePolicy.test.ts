import { describe, expect, it } from 'vitest';
import * as payeePolicy from './payeePolicy';
import { buildPayeeSnapshot, payeeSnapshotToRecord } from './payeePolicy';

describe('S6 payee-confirm input policy', () => {
  it('builds a snapshot when confirmation is present', () => {
    const snapshot = buildPayeeSnapshot({
      bankName: 'Example Bank',
      accountName: 'Example Owner',
      accountNumber: '1234567890',
      confirmed: true,
    });
    expect(snapshot.qrImageId).toBeNull();
    expect(payeeSnapshotToRecord(snapshot)).toEqual({
      bankName: 'Example Bank',
      accountName: 'Example Owner',
      accountNumber: '1234567890',
      qrImageId: null,
    });
  });

  it('requires explicit confirmation', () => {
    expect(() =>
      buildPayeeSnapshot({
        bankName: 'Example Bank',
        accountName: 'Example Owner',
        accountNumber: '1234567890',
        confirmed: false,
      }),
    ).toThrowError();
  });

  it('rejects blank payee fields', () => {
    expect(() =>
      buildPayeeSnapshot({ bankName: ' ', accountName: 'Name', accountNumber: '1', confirmed: true }),
    ).toThrowError();
  });

  it('offers no system fallback payee; generation must configure a real account', () => {
    expect(Object.keys(payeePolicy)).not.toContain('systemAutoPayee');
  });
});
