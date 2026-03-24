import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";

import { runWithHttpRequestContext } from "../context/http-request-context.service";
import {
  HTTP_REQUEST_ID_METADATA,
  HEADERS_PARAMS,
} from "./http-request-id.constants";
import { HttpRequestIdOptions } from "./http-request-id.types";

@Injectable()
export class HttpRequestIdInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const options = this.resolveOptions(context);
    const className = context.getClass()?.name;
    const methodName = context.getHandler()?.name;

    const req = context.switchToHttp().getRequest<any>();
    const requestId =
      this.extractRequestIdFromHeaders({ headers: req?.headers, options }) ||
      (options.autoGenerateIfMissing === false ? undefined : randomUUID());

    if (requestId) {
      const headerName = options.headerName || HEADERS_PARAMS.REQUEST_ID;
      req.headers = req.headers || {};
      req.headers[headerName] = requestId;
    }

    return runWithHttpRequestContext(
      {
        requestId,
        className,
        methodName,
      },
      () => next.handle(),
    );
  }

  private resolveOptions(context: ExecutionContext): HttpRequestIdOptions {
    const classOptions = this.reflector.get<HttpRequestIdOptions>(
      HTTP_REQUEST_ID_METADATA,
      context.getClass(),
    );

    const methodOptions = this.reflector.get<HttpRequestIdOptions>(
      HTTP_REQUEST_ID_METADATA,
      context.getHandler(),
    );

    return {
      headerName: HEADERS_PARAMS.REQUEST_ID,
      fallbackHeaderNames: HEADERS_PARAMS.FALLBACKS,
      autoGenerateIfMissing: true,
      ...(classOptions || {}),
      ...(methodOptions || {}),
    };
  }

  private extractRequestIdFromHeaders({
    headers,
    options,
  }: {
    headers: Record<string, any> | undefined;
    options: HttpRequestIdOptions;
  }): string | undefined {
    if (!headers) {
      return undefined;
    }

    const names = [
      options.headerName || HEADERS_PARAMS.REQUEST_ID,
      ...(options.fallbackHeaderNames || []),
    ];

    for (const name of names) {
      const value = this.getHeaderCaseInsensitive(headers, name);
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private getHeaderCaseInsensitive(
    headers: Record<string, any>,
    name: string,
  ): any {
    const desired = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === desired) {
        return v;
      }
    }
    return undefined;
  }
}
