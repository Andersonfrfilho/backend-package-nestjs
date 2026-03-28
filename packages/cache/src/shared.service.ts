import { Inject, Injectable, Optional } from "@nestjs/common";
import type { ExampleOptions, ExampleServiceInterface } from "./types";

@Injectable()
export class ExampleService implements ExampleServiceInterface {
  constructor(
    @Optional()
    @Inject(EXAMPLE_OPTIONS_TOKEN)
    private readonly options: ExampleOptions,
  ) {}

  getPrefix(): string {

    return this.options?.prefix ?? "app";
  }

  isEnabled(): boolean {
    return !!this.options?.enabled;
  }
}
