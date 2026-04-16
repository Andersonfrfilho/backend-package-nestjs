import { Injectable, Inject } from "@nestjs/common";
import { Logger as WinstonLoggerType } from "winston";
import {
  type DebugParams,
  type DebugResult,
  type ErrorParams,
  type ErrorResult,
  type InfoParams,
  type InfoResult,
  type LoggerProviderInterface,
  LoggerLevel,
  type WarnParams,
  type WarnResult,
  type WriteLogParams,
  type WriteLogResult,
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

  debug(payload: DebugParams): DebugResult {
    this.log({
      level: LoggerLevel.DEBUG,
      payload: {
        ...payload,
        context: payload.context || this.context,
      },
    });
  }

  info(payload: InfoParams): InfoResult {
    this.log({
      level: LoggerLevel.INFO,
      payload: {
        ...payload,
        context: payload.context || this.context,
      },
    });
  }

  warn(payload: WarnParams): WarnResult {
    this.log({
      level: LoggerLevel.WARN,
      payload: {
        ...payload,
        context: payload.context || this.context,
      },
    });
  }

  error(payload: ErrorParams): ErrorResult {
    this.log({
      level: LoggerLevel.ERROR,
      payload: {
        ...payload,
        context: payload.context || this.context,
      },
    });
  }

  setContext(context: string): void {
    this.context = context;
  }

  private log(params: WriteLogParams): WriteLogResult {
    const { level, payload } = params;
    // Extract standard fields but keep the rest to pass to Winston
    const { message, context, meta, ...rest } = payload as any;

    const messageText = message ?? EMPTY_STRING;
    const messageContext = context ?? this.context;
    const obfuscatedMeta = this.obfuscator ? this.obfuscator(meta) : meta;

    const requestContext = getContext();
    const requestIdFromContext = requestContext?.requestId;

    // Merge everything into a flat info object for Winston
    const logInfo: Record<string, unknown> = {
      ...rest,
      context: messageContext,
      requestId: requestIdFromContext || rest.requestId,
      meta: obfuscatedMeta,
    };

    this.logger.log(level as unknown as string, messageText, logInfo);
  }
}
