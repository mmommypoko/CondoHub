import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const FORM_FILES = [
  'src/app/admin/users/UserProvisionForm.tsx',
  'src/modules/announcements/ui/AnnouncementCreateForm.tsx',
  'src/modules/announcements/ui/AnnouncementEditForm.tsx',
  'src/modules/billing-payments/ui/PaymentSettingsForm.tsx',
  'src/modules/billing-payments/ui/RentSettingsForm.tsx',
  'src/modules/facility-booking/ui/BookingCancelButton.tsx',
  'src/modules/facility-booking/ui/ClosureCreateForm.tsx',
  'src/modules/facility-booking/ui/ConfigChangeForm.tsx',
  'src/modules/facility-booking/ui/FacilityCreateForm.tsx',
  'src/modules/facility-booking/ui/FacilityEditForm.tsx',
  'src/modules/identity-access/ui/ChangePasswordForm.tsx',
  'src/modules/identity-access/ui/LoginForm.tsx',
  'src/modules/maintenance/ui/TicketCreateForm.tsx',
  'src/modules/property-membership/ui/BuildingCreateForm.tsx',
  'src/modules/property-membership/ui/BuildingEditForm.tsx',
  'src/modules/property-membership/ui/FloorCreateForm.tsx',
  'src/modules/property-membership/ui/FloorRowActions.tsx',
  'src/modules/property-membership/ui/OwnershipForms.tsx',
  'src/modules/property-membership/ui/RoomCreateForm.tsx',
  'src/modules/property-membership/ui/RoomMemberAddForm.tsx',
  'src/modules/property-membership/ui/RoomRowActions.tsx',
  'src/modules/property-membership/ui/TenancyCreateForm.tsx',
  'src/modules/property-membership/ui/TenantAccountForm.tsx',
];

// PaymentSubmitForm uses anchor focus, its only field is set via setValue with no registered input.
const ANCHOR_SKIP = 'src/modules/billing-payments/ui/PaymentSubmitForm.tsx';
// FormDialog is an infra shell with no useForm call, it matches grep only via useFormDialog.
const INFRA_SKIP = 'src/shared/ui/FormDialog.tsx';
const SKIPPED_FILES = [ANCHOR_SKIP, INFRA_SKIP];

// Publish fields are registered in the child component via the register prop.
const CHILD_REGISTER_SOURCES: Record<string, string[]> = {
  'src/modules/announcements/ui/AnnouncementCreateForm.tsx': [
    'src/modules/announcements/ui/AnnouncementPublishingFields.tsx',
  ],
  'src/modules/announcements/ui/AnnouncementEditForm.tsx': [
    'src/modules/announcements/ui/AnnouncementPublishingFields.tsx',
  ],
};

const ORDER_PATTERN = /(?:\w*FIELD_ORDER\w*|const\s+order)\s*(?::[^=;]*?)?=\s*\[([\s\S]*?)\]/g;
const LITERAL_PATTERN = /(['"`])([^'"`]+)\1/g;
const REGISTER_PATTERN = /register\(\s*(['"`])([^'"`]*?)\1/g;
const IDENT_PATTERN = /^[A-Za-z_$][\w$]*$/;

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function extractOrderEntries(text: string): { entries: Set<string>; arrayCount: number } {
  const entries = new Set<string>();
  let arrayCount = 0;
  ORDER_PATTERN.lastIndex = 0;
  let arrayMatch: RegExpExecArray | null;
  while ((arrayMatch = ORDER_PATTERN.exec(text)) !== null) {
    arrayCount += 1;
    const body = arrayMatch[1] ?? '';
    LITERAL_PATTERN.lastIndex = 0;
    let literalMatch: RegExpExecArray | null;
    while ((literalMatch = LITERAL_PATTERN.exec(body)) !== null) {
      const name = literalMatch[2] ?? '';
      if (IDENT_PATTERN.test(name)) entries.add(name);
    }
  }
  return { entries, arrayCount };
}

function extractRegisterNames(text: string): Set<string> {
  const names = new Set<string>();
  REGISTER_PATTERN.lastIndex = 0;
  let registerMatch: RegExpExecArray | null;
  while ((registerMatch = REGISTER_PATTERN.exec(text)) !== null) {
    const name = registerMatch[2] ?? '';
    if (IDENT_PATTERN.test(name)) names.add(name);
  }
  return names;
}

describe('fieldOrderCompleteness', () => {
  it('covers exactly the 23 wired files and skips the 2 justified cases', () => {
    expect(FORM_FILES).toHaveLength(23);
    expect(new Set(FORM_FILES).size).toBe(FORM_FILES.length);
    for (const skipped of SKIPPED_FILES) {
      expect(FORM_FILES).not.toContain(skipped);
    }
  });

  for (const file of FORM_FILES) {
    it(`${file} keeps FIELD_ORDER and register calls in sync`, () => {
      const text = readFile(file);
      const { entries: orderEntries, arrayCount } = extractOrderEntries(text);
      expect(arrayCount, `${file} should declare at least one FIELD_ORDER array`).toBeGreaterThan(0);
      const localRegisters = extractRegisterNames(text);
      const allRegisters = new Set(localRegisters);
      for (const child of CHILD_REGISTER_SOURCES[file] ?? []) {
        for (const name of extractRegisterNames(readFile(child))) allRegisters.add(name);
      }
      const missingRegister = [...orderEntries].filter((name) => !allRegisters.has(name)).sort();
      const missingOrder = [...localRegisters].filter((name) => !orderEntries.has(name)).sort();
      expect(missingRegister, `${file} FIELD_ORDER entries without a register call`).toEqual([]);
      expect(missingOrder, `${file} register calls missing from FIELD_ORDER`).toEqual([]);
    });
  }
});
