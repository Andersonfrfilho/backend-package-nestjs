import { Injectable, Inject } from "@nestjs/common";
import type { LoggerProviderInterface, LogPayload } from "./logger.interface";
import { WINSTON_LOGGER } from "./implementations/winston/winston.logger.token";

@Injectable()
export class LoggerProvider implements LoggerProviderInterface {
  constructor(
    @Inject(WINSTON_LOGGER)
    private readonly implementation: LoggerProviderInterface,
  ) {}

  debug(payload: LogPayload): void;
  debug(
    message: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void;
  debug(...args: unknown[]): void {
    // @ts-ignore - delegate to implementation which supports overloads
    return this.implementation.debug(...(args as any));
  }

  info(payload: LogPayload): void;
  info(message: string, meta?: Record<string, unknown>, context?: string): void;
  info(...args: unknown[]): void {
    // @ts-ignore
    return this.implementation.info(...(args as any));
  }

  warn(payload: LogPayload): void;
  warn(message: string, meta?: Record<string, unknown>, context?: string): void;
  warn(...args: unknown[]): void {
    // @ts-ignore
    return this.implementation.warn(...(args as any));
  }

  error(payload: LogPayload): void;
  error(
    message: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void;
  error(...args: unknown[]): void {
    // @ts-ignore
    return this.implementation.error(...(args as any));
  }
  setContext?(context: string): void {
    if (typeof this.implementation.setContext === "function") {
      return this.implementation.setContext(context);
    }
    return;
  }
}
