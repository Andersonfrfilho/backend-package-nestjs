export enum LoggerLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LoggerMessage {
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
}
export interface LogPayload {
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
}

export interface LoggerProviderInterface {
  debug(payload: LogPayload): void;
  debug(
    message: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void;
  info(payload: LogPayload): void;
  info(message: string, meta?: Record<string, unknown>, context?: string): void;
  warn(payload: LogPayload): void;
  warn(message: string, meta?: Record<string, unknown>, context?: string): void;
  error(payload: LogPayload): void;
  error(
    message: string,
    meta?: Record<string, unknown>,
    context?: string,
  ): void;
  setContext?(context: string): void;
}

export type LogParams = {
  level: LoggerLevel;
  payload: LogPayload;
};
