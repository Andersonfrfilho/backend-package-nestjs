export enum LoggerLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LoggerMessage {
  message: string;
  context?: string;
  meta?: Record<string, any>;
}
export interface LogPayload {
  message: string;
  context?: string;
  meta?: Record<string, any>;
}

export interface LoggerProviderInterface {
  debug(payload: LogPayload): void;
  info(payload: LogPayload): void;
  warn(payload: LogPayload): void;
  error(payload: LogPayload): void;
  setContext?(context: string): void;
}
