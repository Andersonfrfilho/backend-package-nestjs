import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { EXAMPLE_SERVICE_PROVIDE } from '@adatechnology/package-nestjs';
import { LOGGER_PROVIDER } from '@adatechnology/logger';
import type { LoggerProviderInterface } from '@adatechnology/logger';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(EXAMPLE_SERVICE_PROVIDE) private readonly exampleService: any,
    @Inject(LOGGER_PROVIDER) private readonly logger: LoggerProviderInterface,
  ) {}

  @Get()
  getHello(): string {
    // use example library to compute prefix
    const prefix = this.exampleService?.getPrefix?.() ?? 'unknown';
    const enabled = this.exampleService?.isEnabled?.() ?? false;
    this.logger?.info?.({
      message: 'getHello called',
      meta: { prefix, enabled },
    });
    return `Hello from ${prefix} (enabled=${enabled})`;
  }
}
