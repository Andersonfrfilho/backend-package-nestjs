export interface ExampleOptions {
    prefix?: string;
    enabled?: boolean;
}
export interface ExampleLibInterface extends ExampleOptions {
}
export declare abstract class ExampleSharedServiceInterface {
    abstract getPrefix(): string;
    abstract isEnabled(): boolean;
}
export type ExampleServiceInterface = ExampleSharedServiceInterface;
