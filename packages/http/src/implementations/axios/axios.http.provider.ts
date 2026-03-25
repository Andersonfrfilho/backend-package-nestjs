import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { randomUUID } from "crypto";
import { from, Observable } from "rxjs";

import {
  ErrorInterceptor,
  HttpExternalLogger,
  HttpLoggingConfig,
  HttpLogType,
  HttpRequestLogContext,
  HttpRequestConfig,
  HttpResponse,
  HttpMethod,
} from "../../http.interface";
import { getHttpRequestContext } from "../../context/http-request-context.service";
import { ErrorMapperService } from "../../errors/error-mapper.service";
import { HttpClientError } from "../../errors/http-client-error";

import {
  AxiosHttpProviderInterface,
  CacheEntry,
} from "./axios.http.interfaces";
import { AxiosHttpProviderOptions } from "./types/axios.http.types";
import {
  UrlConfig,
  UrlDataConfig,
  PerformGetParams,
  GenerateCacheKeyParams,
  SetCacheParams,
  SetGlobalHeaderParams,
  SetAuthTokenParams,
} from "./types/axios.http.params";
import {
  HTTP_CLIENT_LABEL,
  HEADERS_PARAMS,
  ANSI_COLORS,
  LOG_TYPES,
  AUTH_SCHEME,
  DEFAULTS,
} from "./axios.http.constants";

/** constants, interfaces and types are moved to dedicated files */

/**
 * Axios-based implementation of the HTTP provider interface.
 * Provides HTTP client functionality with both Promise and Observable APIs,
 * plus basic caching capabilities.
 */
export class AxiosHttpProvider implements AxiosHttpProviderInterface {
  private axiosInstance: AxiosInstance;
  private errorInterceptors: Map<number, ErrorInterceptor> = new Map();
  private nextErrorInterceptorId = 0;
  private requestInterceptorIds: Set<number> = new Set();
  private responseInterceptorIds: Set<number> = new Set();
  private cache = new Map<string, CacheEntry<unknown>>();
  private cacheCleanupInterval?: ReturnType<typeof setInterval>;
  private readonly logger?: HttpExternalLogger;
  private readonly loggingConfig?: HttpLoggingConfig;

  constructor(
    axiosInstance?: AxiosInstance,
    options?: AxiosHttpProviderOptions,
  ) {
    this.axiosInstance = axiosInstance || axios.create();
    this.logger = options?.logger;
    this.loggingConfig = options?.logging;

    this.setupHttpLoggingInterceptors();
    this.startCacheCleanup();
  }

  private setupHttpLoggingInterceptors(): void {
    if (!this.isLoggingEnabled()) {
      return;
    }

    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        (config as unknown as Record<string, unknown>).__httpStartedAt =
          Date.now();

        if (this.shouldLogType(LOG_TYPES.REQUEST)) {
          const logContext = this.extractLogContext(config);
          this.emitLog(LOG_TYPES.REQUEST, {
            method: (config.method || HttpMethod.GET).toUpperCase(),
            url: this.resolveRequestUrl(config),
            source: this.buildSource(logContext),
            requestId: logContext.requestId,
            headers: this.loggingConfig?.includeHeaders
              ? this.sanitizeHeaders(config.headers as Record<string, unknown>)
              : undefined,
            data: this.loggingConfig?.includeBody ? config.data : undefined,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        if (this.shouldLogType(LOG_TYPES.ERROR)) {
          this.emitLog(LOG_TYPES.ERROR, {
            phase: "request",
            message: error.message,
            url: this.resolveRequestUrl(error.config),
          });
        }

        return Promise.reject(error);
      },
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        if (this.shouldLogType(LOG_TYPES.RESPONSE)) {
          const logContext = this.extractLogContext(response.config);
          const startedAt = (
            response.config as unknown as Record<string, unknown>
          ).__httpStartedAt as number | undefined;
          const durationMs = startedAt ? Date.now() - startedAt : undefined;

          this.emitLog(LOG_TYPES.RESPONSE, {
            method: (response.config.method || HttpMethod.GET).toUpperCase(),
            url: this.resolveRequestUrl(response.config),
            source: this.buildSource(logContext),
            requestId: logContext.requestId,
            status: response.status,
            durationMs,
            headers: this.loggingConfig?.includeHeaders
              ? this.sanitizeHeaders(
                  response.headers as Record<string, unknown>,
                )
              : undefined,
            data: this.loggingConfig?.includeBody ? response.data : undefined,
          });
        }

        return response;
      },
      (error: AxiosError) => {
        if (this.shouldLogType(LOG_TYPES.ERROR)) {
          const cfg = error.config as unknown;
          const logContext = this.extractLogContext(cfg);
          const startedAt = (cfg as Record<string, unknown>)
            ?.__httpStartedAt as number | undefined;
          const durationMs = startedAt ? Date.now() - startedAt : undefined;

          this.emitLog(LOG_TYPES.ERROR, {
            phase: "response",
            method: (cfg?.method || HttpMethod.GET).toUpperCase(),
            url: this.resolveRequestUrl(cfg),
            source: this.buildSource(logContext),
            requestId: logContext.requestId,
            status: error.response?.status,
            durationMs,
            message: error.message,
            responseData: this.loggingConfig?.includeBody
              ? error.response?.data
              : undefined,
          });
        }

        return Promise.reject(error);
      },
    );
  }

  private isLoggingEnabled(): boolean {
    if (!this.loggingConfig?.enabled) {
      return false;
    }

    const envs = this.loggingConfig.environments;
    if (!envs || envs.length === 0) {
      return true;
    }

    const currentEnv = process.env.NODE_ENV || "development";
    return envs.includes(currentEnv);
  }

  private shouldLogType(type: HttpLogType): boolean {
    if (!this.isLoggingEnabled()) {
      return false;
    }

    const types = this.loggingConfig?.types;
    if (!types || types.length === 0) {
      return true;
    }

    return types.includes(type);
  }

  private emitLog(type: HttpLogType, meta?: Record<string, unknown>): void {
    const context = this.loggingConfig?.context || HTTP_CLIENT_LABEL;
    const message = this.buildLogMessage(type, meta?.source, meta?.requestId);
    const normalizedMeta = this.normalizeMetaForLogging(meta);

    if (this.logger) {
      if (type === LOG_TYPES.ERROR) {
        this.logger.error?.({ message, context, meta: normalizedMeta });
        return;
      }

      this.logger.info?.({ message, context, meta: normalizedMeta });
      return;
    }

    if (type === LOG_TYPES.ERROR) {
      console.error(message, { context, ...normalizedMeta });
      return;
    }

    console.log(message, { context, ...normalizedMeta });
  }

  private buildLogMessage(
    type: HttpLogType,
    source?: string,
    requestId?: string,
  ): string {
    const typeLabel = String(type).toLowerCase();
    const requestIdLabel = requestId || HEADERS_PARAMS.NO_REQUEST_ID_LABEL;
    const prefix =
      source && typeof source === "string"
        ? `[${requestIdLabel}][${typeLabel}][${source}]`
        : `[${requestIdLabel}][${typeLabel}]`;

    const baseMessage = `${prefix} - ${HTTP_CLIENT_LABEL}`;

    if (type === LOG_TYPES.ERROR) {
      return `${ANSI_COLORS.ERROR}${baseMessage}${ANSI_COLORS.RESET}`;
    }

    if (type === LOG_TYPES.RESPONSE) {
      return `${ANSI_COLORS.WARN}${baseMessage}${ANSI_COLORS.RESET}`;
    }

    if (type === LOG_TYPES.REQUEST) {
      return `${ANSI_COLORS.INFO}${baseMessage}${ANSI_COLORS.RESET}`;
    }

    return baseMessage;
  }

  private normalizeMetaForLogging(
    meta?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!meta) {
      return undefined;
    }

    const entries = Object.entries(meta)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, this.normalizeMetaValue(key, value)]);

    return Object.fromEntries(entries);
  }

  private normalizeMetaValue(key: string, value: unknown): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    if (key === "data" || key === "responseData") {
      return this.stringifyForLog(value);
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const cleanedEntries = Object.entries(
        value as Record<string, unknown>,
      ).filter(([, v]) => v !== undefined);
      return Object.fromEntries(cleanedEntries);
    }

    return value;
  }

  private stringifyForLog(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  private resolveRequestUrl(config?: {
    baseURL?: string;
    url?: string;
  }): string {
    if (!config?.url) {
      return "";
    }

    if (!config.baseURL) {
      return config.url;
    }

    if (/^https?:\/\//i.test(config.url)) {
      return config.url;
    }

    return `${config.baseURL}${config.url}`;
  }

  private sanitizeHeaders(
    headers?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!headers) {
      return undefined;
    }

    const sanitized = { ...headers };
    const authorization =
      sanitized.Authorization || sanitized.authorization || undefined;

    if (authorization && typeof authorization === "string") {
      const token = authorization.includes(" ")
        ? authorization.split(" ").slice(1).join(" ")
        : authorization;
      const prefix = authorization.includes(" ")
        ? `${authorization.split(" ")[0]} `
        : "";

      const masked = `${prefix}${AxiosHttpProvider.maskToken(token, 6)}`;

      if (sanitized.Authorization) {
        sanitized.Authorization = masked;
      }

      if (sanitized.authorization) {
        sanitized.authorization = masked;
      }
    }

    return sanitized;
  }

  private extractLogContext(config?: unknown): HttpRequestLogContext {
    const requestLogContext = ((config as Record<string, unknown>)
      ?.logContext || {}) as HttpRequestLogContext;
    const decoratorContext = getHttpRequestContext();

    const requestIdHeaderName = this.getRequestIdHeaderName();
    const requestIdFromHeader = this.getHeaderValue({
      config,
      headerName: requestIdHeaderName,
    });

    let resolvedRequestId =
      requestLogContext.requestId ||
      requestIdFromHeader ||
      decoratorContext?.requestId;

    if (!resolvedRequestId && this.shouldAutoGenerateRequestId()) {
      resolvedRequestId = randomUUID();
      this.setHeaderValue({
        config,
        headerName: requestIdHeaderName,
        value: resolvedRequestId,
      });
    }

    return {
      className: requestLogContext.className || decoratorContext?.className,
      methodName: requestLogContext.methodName || decoratorContext?.methodName,
      requestId: resolvedRequestId,
    };
  }

  private getRequestIdHeaderName(): string {
    return (
      this.loggingConfig?.requestId?.headerName || HEADERS_PARAMS.REQUEST_ID
    );
  }

  private shouldAutoGenerateRequestId(): boolean {
    return Boolean(this.loggingConfig?.requestId?.autoGenerateIfMissing);
  }

  private getHeaderValue({
    config,
    headerName,
  }: {
    config: unknown;
    headerName: string;
  }): string | undefined {
    const headers = (config as Record<string, unknown>)?.headers;
    if (!headers) {
      return undefined;
    }

    if (typeof (headers as any)?.get === "function") {
      const val = (headers as any).get(headerName);
      return typeof val === "string" ? val : undefined;
    }

    const normalizedName = headerName.toLowerCase();
    const entries = Object.entries(headers as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (key.toLowerCase() === normalizedName && typeof value === "string") {
        return value;
      }
    }

    return undefined;
  }

  private setHeaderValue({
    config,
    headerName,
    value,
  }: {
    config: unknown;
    headerName: string;
    value: string;
  }): void {
    if (!config) {
      return;
    }

    const headers = (config as Record<string, unknown>)?.headers as
      | Record<string, unknown>
      | undefined;
    if (!headers) {
      (config as Record<string, unknown>).headers = {
        [headerName]: value,
      } as unknown;
      return;
    }

    if (typeof (headers as any).set === "function") {
      (headers as any).set(headerName, value);
      return;
    }

    (headers as Record<string, unknown>)[headerName] = value;
  }

  private buildSource(logContext: HttpRequestLogContext): string | undefined {
    if (logContext.className && logContext.methodName) {
      return `${logContext.className}.${logContext.methodName}`;
    }

    if (logContext.className) {
      return logContext.className;
    }

    if (logContext.methodName) {
      return logContext.methodName;
    }

    return undefined;
  }

  /**
   * Starts automatic cache cleanup
   */
  private startCacheCleanup(): void {
    // Clean expired cache entries every default cache interval
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, DEFAULTS.CACHE_TTL);
  }

  /**
   * Stops automatic cache cleanup
   */
  private stopCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Generates a cache key from URL and config
   */
  private generateCacheKey({ url, config }: GenerateCacheKeyParams): string {
    const params = config?.params ? JSON.stringify(config.params) : "";
    return `${url}${params}`;
  }

  /**
   * Gets cached data if valid
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Sets data in cache
   */
  private setCache<T>({
    key,
    data,
    ttl = DEFAULTS.CACHE_TTL,
  }: SetCacheParams<T>): void {
    // default ttl
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clears cache for a specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Sets a global header that will be included in all requests.
   */
  setGlobalHeader({ key, value }: SetGlobalHeaderParams): void {
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  /**
   * Removes a global header.
   */
  removeGlobalHeader(key: string): void {
    delete this.axiosInstance.defaults.headers.common[key];
  }

  /**
   * Gets all global headers currently set.
   */
  getGlobalHeaders(): Record<string, string> {
    return { ...this.axiosInstance.defaults.headers.common } as Record<
      string,
      string
    >;
  }

  /**
   * Sets the base URL for all requests.
   */
  setBaseUrl(baseUrl: string): void {
    this.axiosInstance.defaults.baseURL = baseUrl;
  }

  /**
   * Gets the current base URL.
   */
  getBaseUrl(): string {
    return this.axiosInstance.defaults.baseURL || "";
  }

  /**
   * Sets the default timeout for all requests.
   */
  setDefaultTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
  }

  /**
   * Adds an error interceptor for handling errors globally.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): number {
    const id = this.nextErrorInterceptorId++;
    this.errorInterceptors.set(id, interceptor);
    return id;
  }

  /**
   * Adds a request interceptor to the underlying Axios instance.
   */
  addRequestInterceptor(
    onFulfilled: (config: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ): number {
    const id = this.axiosInstance.interceptors.request.use(
      onFulfilled,
      onRejected,
    );
    this.requestInterceptorIds.add(id);
    return id;
  }

  /**
   * Removes a request interceptor by id.
   */
  removeRequestInterceptor(id: number): void {
    this.axiosInstance.interceptors.request.eject(id);
    this.requestInterceptorIds.delete(id);
  }

  /**
   * Adds a response interceptor to the underlying Axios instance.
   */
  addResponseInterceptor(
    onFulfilled: (res: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ): number {
    const id = this.axiosInstance.interceptors.response.use(
      onFulfilled,
      onRejected,
    );
    this.responseInterceptorIds.add(id);
    return id;
  }

  /**
   * Removes a response interceptor by id.
   */
  removeResponseInterceptor(id: number): void {
    this.axiosInstance.interceptors.response.eject(id);
    this.responseInterceptorIds.delete(id);
  }

  /**
   * Removes an error interceptor by its ID.
   */
  removeErrorInterceptor(id: number): void {
    this.errorInterceptors.delete(id);
  }

  /**
   * Performs a GET request to the specified URL.
   */
  async get<T>({ url, config }: UrlConfig): Promise<HttpResponse<T>> {
    const cacheKey = this.generateCacheKey({ url, config });
    const cached = this.getCached<T>(cacheKey);
    if (cached) {
      return {
        data: cached,
        status: 200,
        statusText: DEFAULTS.STATUS_TEXT_OK,
        headers: {},
        config: config || { url },
      } as HttpResponse<T>;
    }

    return this.wrapWithErrorInterceptors(() =>
      this.performGet<T>({ url, config, cacheKey }),
    );
  }

  /**
   * Internal method to perform the actual GET request.
   */
  private async performGet<T>({
    url,
    config,
    cacheKey,
  }: PerformGetParams): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    const transformed = this.transformResponse<T>(response);

    if (cacheKey && config?.cache !== false) {
      this.setCache({
        key: cacheKey,
        data: transformed.data,
        ttl: config?.cacheTtl,
      });
    }

    return transformed;
  }

  /**
   * Performs a GET request and returns an Observable.
   */
  get$<T>({ url, config }: UrlConfig): Observable<HttpResponse<T>> {
    return from(this.get<T>({ url, config }));
  }

  /**
   * Performs a POST request.
   */
  async post<T>({
    url,
    data,
    config,
  }: UrlDataConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() =>
      this.performPost<T>({ url, data, config }),
    );
  }

  /**
   * Internal method to perform the actual POST request.
   */
  private async performPost<T>({
    url,
    data,
    config,
  }: UrlDataConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs a POST request and returns an Observable.
   */
  post$<T>({ url, data, config }: UrlDataConfig): Observable<HttpResponse<T>> {
    return from(this.post<T>({ url, data, config }));
  }

  /**
   * Performs a PUT request.
   */
  async put<T>({ url, data, config }: UrlDataConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() =>
      this.performPut<T>({ url, data, config }),
    );
  }

  /**
   * Internal method to perform the actual PUT request.
   */
  private async performPut<T>({
    url,
    data,
    config,
  }: UrlDataConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs a PUT request and returns an Observable.
   */
  put$<T>({ url, data, config }: UrlDataConfig): Observable<HttpResponse<T>> {
    return from(this.put<T>({ url, data, config }));
  }

  /**
   * Performs a PATCH request.
   */
  async patch<T>({
    url,
    data,
    config,
  }: UrlDataConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() =>
      this.performPatch<T>({ url, data, config }),
    );
  }

  /**
   * Internal method to perform the actual PATCH request.
   */
  private async performPatch<T>({
    url,
    data,
    config,
  }: UrlDataConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs a PATCH request and returns an Observable.
   */
  patch$<T>({ url, data, config }: UrlDataConfig): Observable<HttpResponse<T>> {
    return from(this.patch<T>({ url, data, config }));
  }

  /**
   * Performs a DELETE request.
   */
  async delete<T>({ url, config }: UrlConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() =>
      this.performDelete<T>({ url, config }),
    );
  }

  /**
   * Internal method to perform the actual DELETE request.
   */
  private async performDelete<T>({
    url,
    config,
  }: UrlConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs a DELETE request and returns an Observable.
   */
  delete$<T>({ url, config }: UrlConfig): Observable<HttpResponse<T>> {
    return from(this.delete<T>({ url, config }));
  }

  /**
   * Performs a HEAD request.
   */
  async head<T>({ url, config }: UrlConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() =>
      this.performHead<T>({ url, config }),
    );
  }

  /**
   * Internal method to perform the actual HEAD request.
   */
  private async performHead<T>({
    url,
    config,
  }: UrlConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.head<T>(url, config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs a HEAD request and returns an Observable.
   */
  head$<T>({ url, config }: UrlConfig): Observable<HttpResponse<T>> {
    return from(this.head<T>({ url, config }));
  }

  /**
   * Performs an OPTIONS request.
   */
  async options<T>({ url, config }: UrlConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() =>
      this.performOptions<T>({ url, config }),
    );
  }

  /**
   * Internal method to perform the actual OPTIONS request.
   */
  private async performOptions<T>({
    url,
    config,
  }: UrlConfig): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.options<T>(url, config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs an OPTIONS request and returns an Observable.
   */
  options$<T>({ url, config }: UrlConfig): Observable<HttpResponse<T>> {
    return from(this.options<T>({ url, config }));
  }

  /**
   * Performs a custom HTTP request.
   */
  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.wrapWithErrorInterceptors(() => this.performRequest<T>(config));
  }

  /**
   * Internal method to perform the actual custom request.
   */
  private async performRequest<T>(
    config: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    const response = await this.axiosInstance.request<T>(config);
    return this.transformResponse<T>(response);
  }

  /**
   * Performs a custom HTTP request and returns an Observable.
   */
  request$<T>(config: HttpRequestConfig): Observable<HttpResponse<T>> {
    return from(this.request<T>(config));
  }

  /**
   * Sets the authorization token for requests.
   */
  setAuthToken({ token, type = AUTH_SCHEME.BEARER }: SetAuthTokenParams): void {
    this.axiosInstance.defaults.headers.common[HEADERS_PARAMS.AUTHORIZATION] =
      `${type} ${token}`;
    // Log only the initial part of the token to avoid exposing the full secret in logs
    try {
      const masked = AxiosHttpProvider.maskToken(token);

      console.debug(`[AxiosHttpProvider] setAuthToken ${type} ${masked}`);
    } catch (err) {
      // swallow logging errors
    }
  }

  /**
   * Clears the authorization token.
   */
  clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common[
      HEADERS_PARAMS.AUTHORIZATION
    ];
  }

  /**
   * Processes an error through all registered error interceptors.
   */
  private async processErrorInterceptors(error: unknown): Promise<unknown> {
    let processedError = error;

    for (const interceptor of this.errorInterceptors.values()) {
      try {
        processedError = await interceptor(processedError);
      } catch (interceptorError) {
        console.warn("Error interceptor failed:", interceptorError);
      }
    }

    return processedError;
  }

  /**
   * Returns a masked version of the token showing only the initial characters.
   */
  private static maskToken(token: string, visibleChars = 8): string {
    if (!token || typeof token !== "string") return "";
    return token.length <= visibleChars
      ? token
      : `${token.slice(0, visibleChars)}...`;
  }

  /**
   * Wraps a promise-returning HTTP method with error interceptor processing.
   */
  private async wrapWithErrorInterceptors<T>(
    method: () => Promise<HttpResponse<T>>,
  ): Promise<HttpResponse<T>> {
    try {
      return await method();
    } catch (error) {
      const processedError = await this.processErrorInterceptors(error);
      // Map to a normalized application error with context
      try {
        const mapper = new ErrorMapperService();
        const mapped = mapper.mapUpstreamError(processedError) as {
          message?: string;
          status?: number;
          code?: string;
          context?: Record<string, unknown>;
        };
        throw new HttpClientError({
          message: mapped.message,
          status: mapped.status,
          code: mapped.code,
          context: mapped.context,
        });
      } catch (mapErr) {
        // If mapping fails, rethrow a generic HttpClientError with minimal context
        const fallback = new HttpClientError({
          message:
            (processedError &&
              (processedError as Record<string, unknown>).message) ||
            "HTTP client error",
          status:
            ((processedError &&
              (processedError as Record<string, unknown>).status) as number) ||
            502,
          code: (processedError &&
            (processedError as Record<string, unknown>).code) as
            | string
            | undefined,
          context: { original: String(processedError) },
        });
        throw fallback;
      }
    }
  }

  /**
   * Transforms an Axios response to the standardized HTTP response format.
   */
  private transformResponse<T>(response: AxiosResponse<T>): HttpResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      config: response.config as HttpRequestConfig,
    };
  }
}
