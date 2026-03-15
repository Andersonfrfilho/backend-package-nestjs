import { BaseAppError } from "./base-app-error";

export class HttpClientError extends BaseAppError {
  constructor(message: string, status?: number, code?: string, context?: Record<string, any>) {
    super(message, status ?? 502, code, { service: '@adatechnology/http-client', ...(context || {}) });
  }
}
