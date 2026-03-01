import { Injectable, Inject } from '@nestjs/common';
import { EXAMPLE_SERVICE_PROVIDE } from '@backend/package-nestjs';
import type { ExampleServiceInterface } from '@backend/package-nestjs';

@Injectable()
export class AppService {
  constructor(
    @Inject(EXAMPLE_SERVICE_PROVIDE)
    private readonly exampleService: ExampleServiceInterface,
  ) {}

  getHello(): string {
    try {
      if (this.exampleService?.isEnabled && this.exampleService.isEnabled()) {
        return `${this.exampleService.getPrefix()} - Hello World!`;
      }
    } catch (err) {
      // fall through to default
    }

    return 'Hello World!';
  }
}
