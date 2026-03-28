import { Observable } from "rxjs";

/**
 * HTTP methods supported
 */
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

/**
 * Content types for HTTP requests
 */
export enum ContentType {
  JSON = "application/json",
  FORM_URLENCODED = "application/x-www-form-urlencoded",
  FORM_DATA = "multipart/form-data",
  TEXT = "text/plain",
  XML = "application/xml",
}

/**
 * Tipos de logs suportados no cliente HTTP.
 */
export type HttpLogType = "request" | "response" | "error";

/**
 * Contrato mínimo para um logger externo.
 * Compatível com @adatechnology/logger e outros loggers com interface parecida.
 */
export interface HttpExternalLogger {
  debug?(payload: {
    message: string;
    context?: string;
    meta?: Record<string, unknown>;
  }): void;
  info?(payload: {
    message: string;
    context?: string;
    meta?: Record<string, unknown>;
  }): void;
  warn?(payload: {
    message: string;
    context?: string;
    meta?: Record<string, unknown>;
  }): void;
  error?(payload: {
    message: string;
    context?: string;
    meta?: Record<string, unknown>;
  }): void;
}

/**
 * Configuração de logs do módulo HTTP.
 */
export interface HttpLoggingConfig {
  enabled?: boolean;
  /** Ambientes permitidos (ex.: ["development", "staging"]). */
  environments?: string[];
  /** Tipos de log habilitados. Padrão: request, response e error. */
  types?: HttpLogType[];
  /** Inclui headers no log (com mascaramento básico de Authorization). */
  includeHeaders?: boolean;
  /** Inclui payload/data da requisição e resposta no log. */
  includeBody?: boolean;
  /** Contexto exibido no logger. */
  context?: string;
  /** Configuração do requestId para correlação de logs. */
  requestId?: {
    /**
     * Quando true, gera requestId automaticamente caso não venha em logContext/header.
     */
    autoGenerateIfMissing?: boolean;
    /** Nome do header usado para requestId. Padrão: x-request-id. */
    headerName?: string;
  };
}

/**
 * Contexto opcional da origem da chamada para enriquecer logs HTTP.
 */
export interface HttpRequestLogContext {
  className?: string;
  methodName?: string;
  requestId?: string;
}

/**
 * HTTP request configuration
 */
export interface HttpRequestConfig {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  contentType?: ContentType;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  withCredentials?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  cache?: boolean; // Enable/disable caching for this request
  cacheTtl?: number; // Cache TTL in milliseconds
  cacheKey?: string; // Optional explicit cache key to use for this request
  /**
   * Metadados opcionais para logging (origem da chamada e requestId).
   */
  logContext?: HttpRequestLogContext;
}

/**
 * HTTP response structure
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: HttpRequestConfig;
  request?: unknown;
}

/**
 * HTTP error structure
 */
export interface HttpError extends Error {
  config: HttpRequestConfig;
  response?: HttpResponse;
  status?: number;
  statusText?: string;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

/**
 * Error interceptor function
 */
export type ErrorInterceptor = (error: unknown) => unknown;

/**
 * HTTP provider interface
 */
export interface HttpProviderInterface {
  /**
   * Make a GET request
   */
  get<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make a POST request
   */
  post<T = unknown>(params: {
    url: string;
    data?: unknown;
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make a PUT request
   */
  put<T = unknown>(params: {
    url: string;
    data?: unknown;
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make a PATCH request
   */
  patch<T = unknown>(params: {
    url: string;
    data?: unknown;
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make a DELETE request
   */
  delete<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make a HEAD request
   */
  head<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make an OPTIONS request
   */
  options<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Promise<HttpResponse<T>>;

  /**
   * Make a generic HTTP request
   */
  request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>>;

  /**
   * Set global headers
   */
  setGlobalHeader(params: { key: string; value: string }): void;

  /**
   * Remove global header
   */
  removeGlobalHeader(key: string): void;

  /**
   * Get global headers
   */
  getGlobalHeaders(): Record<string, string>;

  /**
   * Set base URL for all requests
   */
  setBaseUrl(baseUrl: string): void;

  /**
   * Get current base URL
   */
  getBaseUrl(): string;

  /**
   * Set default timeout
   */
  setDefaultTimeout(timeout: number): void;

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): number;

  /**
   * Remove error interceptor
   */
  removeErrorInterceptor(id: number): void;

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: string): void;

  /**
   * Set authorization token
   */
  setAuthToken(params: { token: string; type?: string }): void;

  /**
   * Clear authorization token
   */
  clearAuthToken(): void;

  /**
   * Add request interceptor
   */
  addRequestInterceptor(
    onFulfilled: (config: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ): number;

  /**
   * Remove request interceptor by id
   */
  removeRequestInterceptor(id: number): void;

  /**
   * Add response interceptor
   */
  addResponseInterceptor(
    onFulfilled: (response: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ): number;

  /**
   * Remove response interceptor by id
   */
  removeResponseInterceptor(id: number): void;

  /**
   * Observable version for reactive programming
   */
  get$<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Observable<HttpResponse<T>>;
  post$<T = unknown>(params: {
    url: string;
    data?: unknown;
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">;
  }): Observable<HttpResponse<T>>;
  put$<T = unknown>(params: {
    url: string;
    data?: unknown;
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">;
  }): Observable<HttpResponse<T>>;
  patch$<T = unknown>(params: {
    url: string;
    data?: unknown;
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">;
  }): Observable<HttpResponse<T>>;
  delete$<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Observable<HttpResponse<T>>;
  head$<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Observable<HttpResponse<T>>;
  options$<T = unknown>(params: {
    url: string;
    config?: Omit<HttpRequestConfig, "url" | "method">;
  }): Observable<HttpResponse<T>>;
  request$<T = unknown>(config: HttpRequestConfig): Observable<HttpResponse<T>>;
}
