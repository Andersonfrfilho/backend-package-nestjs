import { AsyncLocalStorage } from "node:async_hooks";
import { RequestContext } from "./async-context.types";

export const asyncLocalStorage = new AsyncLocalStorage<
  Record<string, unknown>
>();

export function getContext(): RequestContext {
  return asyncLocalStorage.getStore();
}

export function runWithContext<T>(
  ctx: Record<string, unknown>,
  fn: () => T,
): T {
  return asyncLocalStorage.run(ctx, fn as any);
}
