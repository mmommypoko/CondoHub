import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  maintenanceStatusHistory,
  maintenanceTicketState,
} from '@/modules/maintenance/infrastructure/schema';
import {
  TICKET_OPEN_STATUSES,
  TICKET_TERMINAL_STATUSES,
} from '@/modules/maintenance/domain/stateMachine';

describe('BUG-053 history states share the ticket state machine vocabulary', () => {
  it('defines the enum from the same six states the state machine allows', () => {
    const machineStates = [...TICKET_OPEN_STATUSES, ...TICKET_TERMINAL_STATUSES].sort();
    expect([...maintenanceTicketState.enumValues].sort()).toEqual(machineStates);
  });

  it('maps from_state and to_state to the ticket-state enum type', () => {
    const config = getTableConfig(maintenanceStatusHistory);
    const names = config.columns.map((column) => column.name);
    expect(names).toContain('from_state');
    expect(names).toContain('to_state');
    const fromState = config.columns.find((column) => column.name === 'from_state');
    const toState = config.columns.find((column) => column.name === 'to_state');
    expect(fromState?.dataType).toBe('string');
    expect(toState?.dataType).toBe('string');
    expect(fromState?.columnType).toBe('PgEnumColumn');
    expect(toState?.columnType).toBe('PgEnumColumn');
  });
});
