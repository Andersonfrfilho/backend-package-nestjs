export interface ErrorContext {
  service?: string;
  url?: string;
  method?: string;
  [key: string]: any;
}

export class BaseAppError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly context?: ErrorContext;

  constructor(message: string, status?: number, code?: string, context?: ErrorContext) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.context = context;
    // maintain proper stack trace (when supported)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
