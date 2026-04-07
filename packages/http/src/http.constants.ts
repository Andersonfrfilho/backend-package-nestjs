import pkg from "../package.json";

export const LIB_NAME = pkg.name;
export const LIB_VERSION = pkg.version;

export const LOG_CONTEXT = {
  AXIOS_HTTP_PROVIDER: "AxiosHttpProvider",
} as const;