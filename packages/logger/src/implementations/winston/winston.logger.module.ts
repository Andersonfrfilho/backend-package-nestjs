import { DynamicModule, Module, Provider } from "@nestjs/common";
import { createLogger, format, transports, LoggerOptions } from "winston";
import { inspect } from "util";
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
              config?.obfuscator ??
              buildDefaultObfuscator(config?.obfuscatorKeys)
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
    const isProduction =
      config?.isProduction ?? process.env.NODE_ENV === "production";
    const useColors = config?.colorize !== false;

    // Standard fields we want to ensure are in the log object
    const standardFields = format((info) => {
      // Extract requestId and context from meta if they exist there
      const meta = info.meta as any;
      if (meta) {
        if (meta.requestId && !info.requestId) {
          info.requestId = meta.requestId;
          delete meta.requestId;
        }
        if (meta.context && !info.context) {
          info.context = meta.context;
          delete meta.context;
        }

        // Extract source (used for className.methodName)
        if (meta.source && !info.source) {
          info.source = meta.source;
          delete meta.source;
        }

        // Support lib identification from metadata
        if (meta.lib && !info.lib) {
          info.lib = meta.lib;
          delete meta.lib;
        }

        // Support lib version identification from metadata
        if (meta.libVersion && !info.libVersion) {
          info.libVersion = meta.libVersion;
          delete meta.libVersion;
        }

        // Support lib method identification
        if (meta.libMethod && !info.libMethod) {
          info.libMethod = meta.libMethod;
          delete meta.libMethod;
        }

        // Support app identification from metadata
        if (meta.appName && !info.appName) {
          info.appName = meta.appName;
          delete meta.appName;
        }

        // Support app version identification from metadata
        if (meta.appVersion && !info.appVersion) {
          info.appVersion = meta.appVersion;
          delete meta.appVersion;
        }

        // Support logContext object from some providers
        if (meta.logContext && !info.source) {
          const lc = meta.logContext;
          if (lc.className && lc.methodName) {
            info.source = `${lc.className}.${lc.methodName}`;
          } else if (lc.className) {
            info.source = lc.className;
          } else if (lc.methodName) {
            info.source = lc.methodName;
          }
        }
      }

      // Default values
      info.requestId = info.requestId || "no-request-id";
      info.context = info.context || config?.context || "App";
      info.appName = info.appName || config?.appName;
      info.appVersion = info.appVersion || config?.appVersion;
      info.lib = info.lib || config?.lib;
      info.libVersion = info.libVersion || config?.libVersion;
      
      return info;
    });

    const levelColorizer = format.colorize();

    // Custom format for development (colorful and intuitive)
    const developmentFormat = format.printf(
      (info) => {
        const { 
          level, message, timestamp, requestId, context, source, 
          meta, stack, appName, appVersion, lib, libMethod, libVersion 
        } = info;
        
        // Colors (using ANSI codes for precision)
        const colors = {
          reset: "\x1b[0m",
          gray: "\x1b[90m",
          cyan: "\x1b[36m",
          magenta: "\x1b[35m",
          yellow: "\x1b[33m",
          red: "\x1b[31m",
          green: "\x1b[32m",
          bold: "\x1b[1m",
        };

        const colorize = (color: string, text: string) => 
          useColors ? `${color}${text}${colors.reset}` : text;

        // No trailing space for the level itself, but keep it uppercase
        const coloredLevel = useColors 
          ? levelColorizer.colorize(level, level.toUpperCase()) 
          : level.toUpperCase();
          
        const coloredTime = colorize(colors.gray, timestamp);
        const coloredRequestId = colorize(colors.cyan, requestId);
        
        // App identification: [App-example@0.0.3]
        let appDisplay = "";
        if (appName) {
          const appText = appVersion ? `${appName}@${appVersion}` : appName;
          appDisplay = `[${colorize(colors.green, `App-${appText}`)}]`;
        }

        // Lib identification: [@adatechnology/http-client:0.0.2]
        let libDisplay = "";
        if (lib) {
          const libText = libVersion ? `${lib}:${libVersion}` : lib;
          libDisplay = `[${colorize(colors.yellow, libText)}]`;
        }

        const mag = colors.magenta;

        // Context formatting logic:
        // [Source] (Magenta) - From the caller (e.g., HttpClientController.listPokemon)
        // [Context.Method] (Magenta) - From the lib itself (e.g., HttpRedisClient.get)
        let sourceDisplay = "";
        let libMethodDisplay = "";

        if (source) {
          sourceDisplay = `[${colorize(mag, source)}]`;
        }

        if (lib) {
          // Inside a library log
          const methodPath = libMethod ? `${context}.${libMethod}` : context;
          libMethodDisplay = `[${colorize(mag, methodPath)}]`;
          
          // If source is the same as context or methodPath, we can omit it to avoid duplication
          if (source === context || source === methodPath) {
            sourceDisplay = "";
          }
        } else if (!source) {
          // App-only log without source: use context
          libMethodDisplay = `[${colorize(mag, context)}]`;
        } else if (source.startsWith(`${context}.`) || source === context) {
          // App-only log where source is more specific than context: use source only
          libMethodDisplay = `[${colorize(mag, source)}]`;
          sourceDisplay = "";
        } else {
          // App-only log with different context and source
          libMethodDisplay = `[${colorize(mag, context)}]`;
          sourceDisplay = `[${colorize(mag, source)}]`;
        }

        // Header line: [App][Lib][requestId][timestamp][Source][LibMethod][LEVEL]
        let output = `${appDisplay}${libDisplay}[${coloredRequestId}][${coloredTime}]${sourceDisplay}${libMethodDisplay}[${coloredLevel}] - ${message}`;

        // Meta data (Pretty printed if not empty)
        if (meta && typeof meta === "object" && Object.keys(meta).length > 0) {
          const inspectedMeta = inspect(meta, {
            colors: useColors,
            depth: null,
            compact: true,
            sorted: true,
            breakLength: Infinity,
          });
          output += ` - ${inspectedMeta}`;
        }

        // Error stack trace
        if (stack) {
          output += `\n${colorize(colors.red, stack)}`;
        }

        return output;
      }
    );

    const formats = [
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      standardFields(),
    ];

    if (isProduction) {
      formats.push(format.json());
    } else {
      formats.push(developmentFormat);
    }

    const defaultFormat = format.combine(...formats);

    const consoleTransport = new transports.Console({
      format: defaultFormat,
    });

    const defaultOptions: LoggerOptions = {
      level:
        config?.level || (process.env.LOG_LEVEL as any) || DEFAULT_LOG_LEVEL,
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
