export const PROJECT_TIMEZONE = process.env.PROJECT_TIMEZONE ?? 'Asia/Bangkok';

export const PROJECT_CURRENCY = 'THB' as const;

export type ProjectCurrency = typeof PROJECT_CURRENCY;
