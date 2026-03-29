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

  debug(payload: LogPayload): void;
  debug(message: string, meta?: Record<string, unknown>, context?: string): void;
  debug(messageOrPayload: string | LogPayload, meta?: Record<string, unknown>, context?: string): void {
    this.handleLog(LoggerLevel.DEBUG, messageOrPayload, meta, context);
  }

  info(payload: LogPayload): void;
  info(message: string, meta?: Record<string, unknown>, context?: string): void;
  info(messageOrPayload: string | LogPayload, meta?: Record<string, unknown>, context?: string): void {
    this.handleLog(LoggerLevel.INFO, messageOrPayload, meta, context);
  }

  warn(payload: LogPayload): void;
  warn(message: string, meta?: Record<string, unknown>, context?: string): void;
  warn(messageOrPayload: string | LogPayload, meta?: Record<string, unknown>, context?: string): void {
    this.handleLog(LoggerLevel.WARN, messageOrPayload, meta, context);
  }

  error(payload: LogPayload): void;
  error(message: string, meta?: Record<string, unknown>, context?: string): void;
  error(messageOrPayload: string | LogPayload, meta?: Record<string, unknown>, context?: string): void {
    this.handleLog(LoggerLevel.ERROR, messageOrPayload, meta, context);
  }

  setContext(context: string): void {
    this.context = context;
  }

  private handleLog(
    level: LoggerLevel,
    messageOrPayload: string | LogPayload,
    meta?: Record<string, unknown>,
    context?: string,
  ): void {
    let payload: LogPayload;

    if (typeof messageOrPayload === "string") {
      payload = {
        message: messageOrPayload,
        meta,
        context: context || this.context,
      };
    } else {
      payload = {
        ...messageOrPayload,
        context: messageOrPayload.context || context || this.context,
        meta: { ...messageOrPayload.meta, ...meta },
      };
    }

    this.log({ level, payload });
  }

  private log(params: LogParams) {
    const { level, payload } = params;
    // Extract standard fields but keep the rest to pass to Winston
    const { message, context, meta, ...rest } = payload as any;
    
    const messageText = message ?? EMPTY_STRING;
    const messageContext = context ?? this.context;
    const obfuscatedMeta = this.obfuscator ? this.obfuscator(meta) : meta;

    const requestContext = getContext();
    const requestIdFromContext = (requestContext as Record<string, unknown> | undefined)?.requestId;
    
    // Merge everything into a flat info object for Winston
    const logInfo: Record<string, unknown> = {
      ...rest,
      context: messageContext,
      requestId: requestIdFromContext || payload.requestId,
      meta: obfuscatedMeta,
    };

    this.logger.log(level as unknown as string, messageText, logInfo);
  }
}
