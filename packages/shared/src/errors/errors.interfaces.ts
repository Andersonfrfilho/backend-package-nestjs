export interface ErrorContext {
  service?: string;
  url?: string;
  method?: string;
  [key: string]: any;
}

export type BaseAppErrorParams<Context = ErrorContext> = {
  message: string;
  status?: number;
  code?: string;
  context?: Context;
};
