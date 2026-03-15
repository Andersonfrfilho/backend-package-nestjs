export interface ErrorContext {
  service?: string;
  url?: string;
  method?: string;
  origin?: { file?: string; fn?: string; line?: number; column?: number };
  stack?: Array<{ fn?: string; file?: string; line?: number; column?: number }>;
  [key: string]: any;
}

export class BaseAppError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly context?: ErrorContext;

  constructor(message: string, status?: number, code?: string, context?: ErrorContext) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.context = context;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, new.target);
    }
  }
}
