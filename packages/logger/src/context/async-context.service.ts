import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = Record<string, any> | undefined;

export const asyncLocalStorage = new AsyncLocalStorage<Record<string, any>>();

export function getContext(): RequestContext {
  return asyncLocalStorage.getStore();
}

export function runWithContext<T>(ctx: Record<string, any>, fn: () => T): T {
  return asyncLocalStorage.run(ctx, fn);
}
