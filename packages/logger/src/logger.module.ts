import { DynamicModule, Module, Scope, Provider } from "@nestjs/common";
import { LoggerProvider } from "./logger.provider";
import { LOGGER_PROVIDER } from "./logger.token";
import { WinstonImplementationModule } from "./implementations/winston/winston.logger.module";

@Module({})
export class LoggerModule {
  static forRoot(
    config?: { requestScoped?: boolean } & Record<string, unknown>,
  ): DynamicModule {
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
}

export { LOGGER_PROVIDER } from "./logger.token";
