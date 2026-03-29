import { DynamicModule, Module, Scope, Provider, Global } from "@nestjs/common";
import { LoggerProvider } from "./logger.provider";
import { LOGGER_PROVIDER } from "./logger.token";
import { WinstonImplementationModule } from "./implementations/winston/winston.logger.module";
import type { LoggerConfig } from "./logger.config";

@Global()
@Module({})
export class LoggerModule {
  static forRoot(config?: LoggerConfig): DynamicModule {
    const implModule = WinstonImplementationModule.forRoot(config);
    const provider: Provider = {
      provide: LOGGER_PROVIDER,
      useClass: LoggerProvider,
    };
    if (config && config.requestScoped) {
      provider.scope = Scope.REQUEST;
    }

    return {
      module: LoggerModule,
      imports: [implModule],
      providers: [provider],
      exports: [LOGGER_PROVIDER],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<LoggerConfig> | LoggerConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        ...(options.imports || []),
        WinstonImplementationModule.forRootAsync(options),
      ],
      providers: [
        {
          provide: LOGGER_PROVIDER,
          useClass: LoggerProvider,
        },
      ],
      exports: [LOGGER_PROVIDER],
    };
  }
}

export { LOGGER_PROVIDER } from "./logger.token";
