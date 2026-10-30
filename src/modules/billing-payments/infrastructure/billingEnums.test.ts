import { describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  payeeType,
  paymentInstruction,
  paymentSubmission,
  turnoverBillingReview,
  turnoverCreationMode,
} from './schema';

vi.mock('server-only', () => ({}));

describe('BUG-050 submission carries its own submitted-at timestamp', () => {
  it('declares submitted_at as a required timestamptz column', () => {
    const config = getTableConfig(paymentSubmission);
    const column = config.columns.find((entry) => entry.name === 'submitted_at');
    expect(column?.notNull).toBe(true);
    expect(column?.dataType).toBe('date');
  });
});

describe('BUG-051 payee type is a closed enum', () => {
  it('declares exactly PROJECT and OWNER values', () => {
    expect([...payeeType.enumValues]).toEqual(['PROJECT', 'OWNER']);
  });

  it('binds the payment instruction column to the enum', () => {
    const config = getTableConfig(paymentInstruction);
    const column = config.columns.find((entry) => entry.name === 'payee_type');
    expect(column?.dataType).toBe('string');
    expect(column?.columnType).toBe('PgEnumColumn');
  });
});

describe('BUG-052 creation mode matches the live vocabulary', () => {
  it('declares the two live modes plus the stored UNKNOWN marker', () => {
    expect([...turnoverCreationMode.enumValues]).toEqual([
      'PROJECT_MANAGED',
      'PRIVATE_OWNER_MANAGED',
      'UNKNOWN',
    ]);
  });

  it('binds the review column to the enum', () => {
    const config = getTableConfig(turnoverBillingReview);
    const column = config.columns.find((entry) => entry.name === 'management_mode_at_creation');
    expect(column?.columnType).toBe('PgEnumColumn');
  });
});
