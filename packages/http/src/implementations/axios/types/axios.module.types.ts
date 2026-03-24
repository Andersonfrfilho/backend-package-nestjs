import { AxiosInstance, AxiosRequestConfig } from "axios";
import { HttpModuleOptions } from "../../http.module";

export type AxiosForRootParam =
  | AxiosRequestConfig
  | AxiosInstance
  | { config?: AxiosRequestConfig | AxiosInstance; options?: HttpModuleOptions };

export type AxiosForRootOptions = HttpModuleOptions;
