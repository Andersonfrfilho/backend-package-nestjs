import { Injectable, Inject } from "@nestjs/common";
import { Observable } from "rxjs";

import {
  ErrorInterceptor,
  HttpProviderInterface,
  HttpRequestConfig,
  HttpResponse,
} from "./http.interface";
import type { AxiosHttpProviderInterface } from "./implementations/axios/axios.http.provider";
import {
  UrlConfig,
  UrlDataConfig,
  SetGlobalHeaderParams,
  SetAuthTokenParams,
} from "./implementations/axios/types/axios.http.params";
import { HTTP_AXIOS_PROVIDER } from "./http.token";

@Injectable()
export class HttpProvider implements HttpProviderInterface {
  constructor(
    @Inject(HTTP_AXIOS_PROVIDER)
    private readonly axiosHttpProvider: AxiosHttpProviderInterface,
  ) {}

  /**
   * Expose underlying axios instance when available from the axios provider implementation.
   * This is intentionally typed as unknown/any to avoid leaking implementation details.
   */
  getAxiosInstance(): unknown | undefined {
    try {
      // Some implementations expose `axiosInstance` or `instance`.
      // Use brute-force access guarded in try/catch to avoid runtime errors.

      const provider = this.axiosHttpProvider as unknown as Record<
        string,
        unknown
      >;
      return (provider?.axiosInstance ?? provider?.instance) as
        | unknown
        | undefined;
    } catch (e) {
      return undefined;
    }
  }

  async get<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.get<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.get<T>(urlOrParams);
  }

  get$<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.get$<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.get$<T>(urlOrParams);
  }

  async post<T>(
    urlOrParams: string | UrlDataConfig,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.post<T>({ url: urlOrParams, data, config });
    }
    return this.axiosHttpProvider.post<T>(urlOrParams);
  }

  post$<T>(
    urlOrParams: string | UrlDataConfig,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.post$<T>({
        url: urlOrParams,
        data,
        config,
      });
    }
    return this.axiosHttpProvider.post$<T>(urlOrParams);
  }

  async put<T>(
    urlOrParams: string | UrlDataConfig,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.put<T>({ url: urlOrParams, data, config });
    }
    return this.axiosHttpProvider.put<T>(urlOrParams);
  }

  put$<T>(
    urlOrParams: string | UrlDataConfig,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.put$<T>({ url: urlOrParams, data, config });
    }
    return this.axiosHttpProvider.put$<T>(urlOrParams);
  }

  async patch<T>(
    urlOrParams: string | UrlDataConfig,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.patch<T>({
        url: urlOrParams,
        data,
        config,
      });
    }
    return this.axiosHttpProvider.patch<T>(urlOrParams);
  }

  patch$<T>(
    urlOrParams: string | UrlDataConfig,
    data?: unknown,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.patch$<T>({
        url: urlOrParams,
        data,
        config,
      });
    }
    return this.axiosHttpProvider.patch$<T>(urlOrParams);
  }

  async delete<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.delete<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.delete<T>(urlOrParams);
  }

  delete$<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.delete$<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.delete$<T>(urlOrParams);
  }

  async head<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.head<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.head<T>(urlOrParams);
  }

  head$<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.head$<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.head$<T>(urlOrParams);
  }

  async options<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.options<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.options<T>(urlOrParams);
  }

  options$<T>(
    urlOrParams: string | UrlConfig,
    config?: HttpRequestConfig,
  ): Observable<HttpResponse<T>> {
    if (typeof urlOrParams === "string") {
      return this.axiosHttpProvider.options$<T>({ url: urlOrParams, config });
    }
    return this.axiosHttpProvider.options$<T>(urlOrParams);
  }

  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.axiosHttpProvider.request<T>(config);
  }

  request$<T>(config: HttpRequestConfig): Observable<HttpResponse<T>> {
    return this.axiosHttpProvider.request$<T>(config);
  }

  setGlobalHeader(params: { key: string; value: string }): void;
  setGlobalHeader(key: string, value: string): void;
  setGlobalHeader(
    keyOrParams: string | SetGlobalHeaderParams,
    value?: string,
  ): void {
    if (typeof keyOrParams === "string") {
      this.axiosHttpProvider.setGlobalHeader({
        key: keyOrParams,
        value: value!,
      });
      return;
    }

    this.axiosHttpProvider.setGlobalHeader(keyOrParams);
  }

  removeGlobalHeader(key: string): void {
    this.axiosHttpProvider.removeGlobalHeader(key);
  }

  getGlobalHeaders(): Record<string, string> {
    return this.axiosHttpProvider.getGlobalHeaders();
  }

  setBaseUrl(baseUrl: string): void {
    this.axiosHttpProvider.setBaseUrl(baseUrl);
  }

  getBaseUrl(): string {
    return this.axiosHttpProvider.getBaseUrl();
  }

  setDefaultTimeout(timeout: number): void {
    this.axiosHttpProvider.setDefaultTimeout(timeout);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): number {
    return this.axiosHttpProvider.addErrorInterceptor(interceptor);
  }

  removeErrorInterceptor(id: number): void {
    this.axiosHttpProvider.removeErrorInterceptor(id);
  }

  clearCache(key?: string): void {
    this.axiosHttpProvider.clearCache(key);
  }

  setAuthToken(params: { token: string; type?: string }): void;
  setAuthToken(token: string, type?: string): void;
  setAuthToken(
    tokenOrParams: string | SetAuthTokenParams,
    type?: string,
  ): void {
    if (typeof tokenOrParams === "string") {
      this.axiosHttpProvider.setAuthToken({ token: tokenOrParams, type });
      return;
    }

    this.axiosHttpProvider.setAuthToken(tokenOrParams);
  }

  clearAuthToken(): void {
    this.axiosHttpProvider.clearAuthToken();
  }

  addRequestInterceptor(
    onFulfilled: (config: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ): number {
    return this.axiosHttpProvider.addRequestInterceptor(
      onFulfilled,
      onRejected,
    );
  }

  removeRequestInterceptor(id: number): void {
    this.axiosHttpProvider.removeRequestInterceptor(id);
  }

  addResponseInterceptor(
    onFulfilled: (response: unknown) => unknown,
    onRejected?: (error: unknown) => unknown,
  ): number {
    return this.axiosHttpProvider.addResponseInterceptor(
      onFulfilled,
      onRejected,
    );
  }

  removeResponseInterceptor(id: number): void {
    this.axiosHttpProvider.removeResponseInterceptor(id);
  }
}
