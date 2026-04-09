import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { LOGGER_PROVIDER } from "../logger.token";
import type { LoggerProviderInterface } from "../logger.interface";
import { HTTP_LOGGING_INTERCEPTOR_CONTEXT } from "./http-logging.interceptor.constant";

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(LOGGER_PROVIDER)
    private readonly logger: LoggerProviderInterface,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Record<string, any>>();
    const response = http.getResponse<Record<string, any>>();
    const start = Date.now();

    const { method, url, headers, body, query, params } = request;

    this.logger.info({
      message: "HTTP Request",
      context: HTTP_LOGGING_INTERCEPTOR_CONTEXT.INTERCEPT,
      meta: {
        request: {
          method,
          path: url,
          headers,
          query: query && Object.keys(query).length ? query : undefined,
          params: params && Object.keys(params).length ? params : undefined,
          body: body && Object.keys(body).length ? body : undefined,
        },
      },
    });

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const durationMs = Date.now() - start;
          const statusCode =
            response?.statusCode ??
            response?.raw?.statusCode ??
            200;

          this.logger.info({
            message: "HTTP Response",
            context: HTTP_LOGGING_INTERCEPTOR_CONTEXT.ON_RESPONSE,
            meta: {
              request: {
                method,
                path: url,
              },
              response: {
                statusCode,
                durationMs,
                body: responseBody ?? undefined,
              },
            },
          });
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - start;

          this.logger.error({
            message: "HTTP Response Error",
            context: HTTP_LOGGING_INTERCEPTOR_CONTEXT.ON_ERROR,
            meta: {
              request: {
                method,
                path: url,
              },
              response: {
                durationMs,
                error: error instanceof Error ? error.message : String(error),
              },
            },
          });
        },
      }),
    );
  }
}
