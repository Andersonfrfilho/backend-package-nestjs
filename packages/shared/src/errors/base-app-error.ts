import { BaseAppErrorParams, ErrorContext } from "./errors.interfaces";

export class BaseAppError<Context = ErrorContext> extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly context?: Context;

  constructor(params: BaseAppErrorParams<Context>) {
    super(params.message);
    this.name = new.target.name;
    this.status = params.status;
    this.code = params.code;
    this.context = params.context;
    // Error.captureStackTrace is a V8/Node extension — guard and cast to any
    // to avoid TypeScript errors in environments that don't expose it.
    (Error as any).captureStackTrace?.(this, this.constructor as any);
  }
}
