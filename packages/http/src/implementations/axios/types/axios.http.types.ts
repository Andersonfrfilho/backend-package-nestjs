import { HttpExternalLogger, HttpLoggingConfig } from "../../http.interface";

export type AxiosHttpProviderOptions = {
  logger?: HttpExternalLogger;
  logging?: HttpLoggingConfig;
};
