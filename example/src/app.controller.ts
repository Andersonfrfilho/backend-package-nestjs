import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { EXAMPLE_SERVICE_PROVIDE } from '@adatechnology/package-nestjs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(EXAMPLE_SERVICE_PROVIDE) private readonly exampleService: any,
  ) {}

  @Get()
  getHello(): string {
    // use example library to compute prefix
    const prefix = this.exampleService?.getPrefix?.() ?? 'unknown';
    const enabled = this.exampleService?.isEnabled?.() ?? false;
    return `Hello from ${prefix} (enabled=${enabled})`;
  }
}
