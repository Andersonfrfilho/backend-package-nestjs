import { Injectable, Inject } from "@nestjs/common";
import type { LoggerProviderInterface, LogPayload } from "./logger.interface";
import { WINSTON_LOGGER } from "./implementations/winston/winston.logger.token";

@Injectable()
export class LoggerProvider implements LoggerProviderInterface {
  constructor(
    @Inject(WINSTON_LOGGER) private readonly impl: LoggerProviderInterface,
  ) {}

  debug(payload: LogPayload): void {
    return this.impl.debug(payload);
  }
  info(payload: LogPayload): void {
    return this.impl.info(payload);
  }
  warn(payload: LogPayload): void {
    return this.impl.warn(payload);
  }
  error(payload: LogPayload): void {
    return this.impl.error(payload);
  }
  setContext?(context: string): void {
    if (typeof this.impl.setContext === "function") {
      return this.impl.setContext(context);
    }
    return;
  }
}
