import { Injectable, Inject } from "@nestjs/common";
import { Logger as WinstonLoggerType } from "winston";
import {
  type LogPayload,
  type LoggerProviderInterface,
  LoggerLevel,
  type LogParams,
} from "../../logger.interface";
import type { Obfuscator } from "./winston.logger.types";
import { getContext } from "../../context/async-context.service";
import { EMPTY_STRING } from "../../logger.constant";
import { WINSTON_RAW, WINSTON_OBFUSCATOR } from "./winston.logger.token";

@Injectable()
export class WinstonLoggerProvider implements LoggerProviderInterface {
  private context?: string;

  constructor(
    @Inject(WINSTON_RAW) private readonly logger: WinstonLoggerType,
    @Inject(WINSTON_OBFUSCATOR) private readonly obfuscator?: Obfuscator,
  ) {}

  // overloads
  debug(payload: LogPayload): void;
  debug(
    message: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void;
  debug(...args: unknown[]): void {
    const payload = this.normalizeArgs(args);
    this.log({ level: LoggerLevel.DEBUG, payload });
  }

  info(payload: LogPayload): void;
  info(message: string, meta?: Record<string, unknown>, context?: string): void;
  info(...args: unknown[]): void {
    const payload = this.normalizeArgs(args);
    this.log({ level: LoggerLevel.INFO, payload });
  }

  warn(payload: LogPayload): void;
  warn(message: string, meta?: Record<string, unknown>, context?: string): void;
  warn(...args: unknown[]): void {
    const payload = this.normalizeArgs(args);
    this.log({ level: LoggerLevel.WARN, payload });
  }

  error(payload: LogPayload): void;
  error(
    message: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void;
  error(...args: unknown[]): void {
    const payload = this.normalizeArgs(args);
    this.log({ level: LoggerLevel.ERROR, payload });
  }
  setContext(context: string): void {
    this.context = context;
  }

  private log(params: LogParams) {
    const { level, payload } = params;
    const messageText = payload?.message ?? EMPTY_STRING;
    const messageContext = payload?.context ?? this.context;
    const meta = payload?.meta;

    const obfuscatedMeta = this.obfuscator ? this.obfuscator(meta) : meta;

    const requestContext = getContext();
    const requestId =
      (meta as Record<string, unknown>)?.requestId ??
      (requestContext as Record<string, unknown> | undefined)?.requestId;
    const metaWithRequest = Object.assign(
      {},
      obfuscatedMeta ?? {},
      requestId ? { requestId } : {},
    );
    const logMeta = messageContext
      ? { context: messageContext, meta: metaWithRequest }
      : { meta: metaWithRequest };

    this.logger.log(level as unknown as string, messageText, logMeta);
  }

  private normalizeArgs(args: unknown[]): LogPayload {
    if (typeof args[0] === "string") {
      const message: string = args[0] as string;
      const meta: Record<string, unknown> | undefined = args[1] as
        | Record<string, unknown>
        | undefined;
      const context: string | undefined = args[2] as string | undefined;
      return { message, meta, context } as LogPayload;
    }
    return args[0] as LogPayload;
  }
}
