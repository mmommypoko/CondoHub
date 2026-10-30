import type { DBAdapter, BetterAuthOptions, Where } from 'better-auth';

type AdapterFactory = (options: BetterAuthOptions) => DBAdapter;

function liveUserWhere(model: string, where: Where[] | undefined): Where[] {
  if (model !== 'user') return where ?? [];
  return [...(where ?? []), { field: 'deletedAt', operator: 'eq', value: null, connector: 'AND' }];
}

export function withLiveUserLookups(factory: AdapterFactory): AdapterFactory {
  return (options) => {
    const adapter = factory(options);
    return {
      ...adapter,
      findOne: <T>(input: Parameters<DBAdapter['findOne']>[0]) =>
        adapter.findOne<T>({ ...input, where: liveUserWhere(input.model, input.where) }),
      findMany: <T>(input: Parameters<DBAdapter['findMany']>[0]) =>
        adapter.findMany<T>({ ...input, where: liveUserWhere(input.model, input.where) }),
      count: (input) =>
        adapter.count({ ...input, where: liveUserWhere(input.model, input.where) }),
    };
  };
}
