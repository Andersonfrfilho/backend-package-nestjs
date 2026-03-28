import { DynamicModule, Module, Provider } from "@nestjs/common";
import { createLogger, format, transports, LoggerOptions } from "winston";
import { WinstonLoggerProvider } from "./winston.logger.provider";
import {
  WINSTON_LOGGER,
  WINSTON_RAW,
  WINSTON_OBFUSCATOR,
} from "./winston.logger.token";
import type { LoggerConfig } from "../../logger.config";
import { DEFAULT_LOG_LEVEL } from "./winston.logger.constants";
import { buildDefaultObfuscator } from "../../obfuscator";

@Module({})
export class WinstonImplementationModule {
  static forRoot(config?: LoggerConfig): DynamicModule {
    const providers = this.createProviders(config);

    return {
      module: WinstonImplementationModule,
      providers,
      exports: [WINSTON_LOGGER],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<LoggerConfig> | LoggerConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: WinstonImplementationModule,
      imports: options.imports || [],
      providers: [
        {
          provide: "LOGGER_CONFIG",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: WINSTON_RAW,
          useFactory: (config: LoggerConfig) => {
            return this.createWinstonLogger(config);
          },
          inject: ["LOGGER_CONFIG"],
        },
        {
          provide: WINSTON_OBFUSCATOR,
          useFactory: (config: LoggerConfig) => {
            return (
              config?.obfuscator ?? buildDefaultObfuscator(config?.obfuscatorKeys)
            );
          },
          inject: ["LOGGER_CONFIG"],
        },
        {
          provide: WINSTON_LOGGER,
          useClass: WinstonLoggerProvider,
        },
      ],
      exports: [WINSTON_LOGGER],
    };
  }

  private static createProviders(config?: LoggerConfig): Provider[] {
    const winstonLogger = this.createWinstonLogger(config);
    const obfuscator =
      config?.obfuscator ?? buildDefaultObfuscator(config?.obfuscatorKeys);

    return [
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
    ];
  }

  private static createWinstonLogger(config?: LoggerConfig) {
    const isProduction = config?.isProduction ?? process.env.NODE_ENV === "production";
    
    // Custom format to match [requestId][context][level] message pattern
    const customFormat = format.printf(({ level, message, timestamp, context, meta }) => {
      const requestId = (meta as any)?.requestId || "no-request-id";
      const ctx = context || (meta as any)?.context || config?.context || "App";
      const time = timestamp || new Date().toISOString();
      
      return `[${requestId}][${time}][${ctx}][${level}]: ${message}`;
    });

    const formats = [
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
    ];

    if (isProduction) {
      formats.push(format.json());
    } else {
      formats.push(customFormat);
    }

    const defaultFormat = format.combine(...formats);

    const consoleTransport = new transports.Console({
      format: config?.colorize !== false && !isProduction
        ? format.combine(format.colorize({ all: true }), defaultFormat)
        : defaultFormat,
    });

    const defaultOptions: LoggerOptions = {
      level: config?.level || (process.env.LOG_LEVEL as any) || DEFAULT_LOG_LEVEL,
      format: defaultFormat,
      transports: [consoleTransport],
    };

    const mergedOptions: LoggerOptions = Object.assign(
      {},
      defaultOptions,
      config?.loggerOptions || {},
    );

    return createLogger(mergedOptions);
  }
}
