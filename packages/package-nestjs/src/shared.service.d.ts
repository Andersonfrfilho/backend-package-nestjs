import type { ExampleOptions, ExampleServiceInterface } from "./types";
export declare class ExampleService implements ExampleServiceInterface {
    private readonly options;
    constructor(options: ExampleOptions);
    getPrefix(): string;
    isEnabled(): boolean;
}
