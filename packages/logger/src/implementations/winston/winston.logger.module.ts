import { DynamicModule, Module } from "@nestjs/common";
import { createLogger, format, transports, LoggerOptions } from "winston";
import { WinstonLoggerProvider } from "./winston.logger.provider";
import { WINSTON_LOGGER } from "./winston.logger.token";
import { WinstonModuleConfig } from "./winston.logger.types";
import { buildDefaultObfuscator } from "../../obfuscator";

@Module({})
export class WinstonImplementationModule {
  static forRoot(config?: WinstonModuleConfig): DynamicModule {
    const defaultFormat = format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
    );

    const defaultOptions: LoggerOptions = {
      level: (process.env.LOG_LEVEL as any) || "info",
      format: defaultFormat,
      transports: [
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
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
          provide: WINSTON_LOGGER,
          useFactory: () =>
            new WinstonLoggerProvider(winstonLogger, obfuscator),
        },
      ],
      exports: [WINSTON_LOGGER],
    };
  }
}
