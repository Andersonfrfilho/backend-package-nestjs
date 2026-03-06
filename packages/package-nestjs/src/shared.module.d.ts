import { DynamicModule } from "@nestjs/common";
import type { ExampleOptions } from "./types";
export declare const EXAMPLE_OPTIONS_TOKEN = "EXAMPLE_OPTIONS";
export declare const EXAMPLE_SERVICE_PROVIDE = "EXAMPLE_SERVICE_PROVIDE";
export declare const EXAMPLE_LIB = "EXAMPLE_LIB";
export declare const createExampleOptionsToken: (name?: string) => string;
export declare const createExampleServiceToken: (name?: string) => string;
export declare class ExampleModule {
    static forRoot(options?: ExampleOptions): DynamicModule;
    static register(name: string, options?: ExampleOptions): DynamicModule;
    static forRootAsync(opts: {
        useFactory: (...args: any[]) => Promise<ExampleOptions> | ExampleOptions;
        inject?: any[];
    }): DynamicModule;
}
