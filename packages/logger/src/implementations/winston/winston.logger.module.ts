import { DynamicModule, Module } from "@nestjs/common";
import { createLogger, format, transports, LoggerOptions } from "winston";
import { WinstonLoggerProvider } from "./winston.logger.provider";
import {
  WINSTON_LOGGER,
  WINSTON_RAW,
  WINSTON_OBFUSCATOR,
} from "./winston.logger.token";
import { WinstonModuleConfig } from "./winston.logger.types";
import { DEFAULT_LOG_LEVEL } from "./winston.logger.constants";
import { buildDefaultObfuscator } from "../../obfuscator";

@Module({})
export class WinstonImplementationModule {
  static forRoot(config?: WinstonModuleConfig): DynamicModule {
    // Custom format to match [requestId][context][level] message pattern
    const customFormat = format.printf(({ level, message, timestamp, context, meta }) => {
      const requestId = (meta as any)?.requestId || 'no-request-id';
      const ctx = context || (meta as any)?.context || 'App';
      const time = timestamp || new Date().toISOString();
      
      return `[${time}] [${requestId}][${ctx}][${level}]: ${message}`;
    });

    const defaultFormat = format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      customFormat
    );

    const defaultOptions: LoggerOptions = {
      level: (process.env.LOG_LEVEL as any) || DEFAULT_LOG_LEVEL,
      format: defaultFormat,
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize({ all: true }),
            defaultFormat
          ),
        }),
      ],
    };

    const mergedOptions: LoggerOptions = Object.assign(
      {},
      defaultOptions,
      config?.loggerOptions || {},
    );

    const winstonLogger = createLogger(mergedOptions);

    const obfuscator =
      config?.obfuscator ?? buildDefaultObfuscator(config?.obfuscatorKeys);

    return {
      module: WinstonImplementationModule,
      providers: [
        {
          provide: WINSTON_RAW,
          useValue: winstonLogger,
        },
        {
          provide: WINSTON_OBFUSCATOR,
          useValue: obfuscator,
        },
        {
          provide: WINSTON_LOGGER,
          useClass: WinstonLoggerProvider,
        },
      ],
      exports: [WINSTON_LOGGER],
    };
  }
}
