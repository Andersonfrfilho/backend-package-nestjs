import { DynamicModule, Module, Scope } from "@nestjs/common";
import { LoggerProvider } from "./logger.provider";
import { LOGGER_PROVIDER } from "./logger.token";
import { WinstonImplementationModule } from "./implementations/winston/winston.logger.module";

@Module({})
export class LoggerModule {
  static forRoot(config?: { requestScoped?: boolean } & any): DynamicModule {
    const implModule = WinstonImplementationModule.forRoot(config);
    const provider: any = {
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
