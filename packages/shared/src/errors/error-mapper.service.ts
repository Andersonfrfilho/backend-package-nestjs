import { Injectable } from "@nestjs/common";
import { BaseAppError } from "./base-app-error";
import type { ErrorContext, BaseAppErrorParams } from "./errors.interfaces";
import { SHARED_ERRORS, SHARED_ERROR_MESSAGES, SHARED_INTERNAL_FRAME_RE } from "./errors.constants";

@Injectable()
export class ErrorMapperService {
  /**
   * Map an upstream/internal error to a BaseAppError with normalized fields.
   * Keeps a small context to help tracing origin without leaking secrets.
   */
  mapUpstreamError(err: unknown): BaseAppError {
    // If it's already a BaseAppError, return as-is
    if (err instanceof BaseAppError) return err;

    try {
      // Axios-like error shape
      const anyErr: any = err as any;

      const context: ErrorContext = {};

      // attach parsed stack frames to context for tracing origin
      if (anyErr?.stack) {
        const frames = this.parseStack(anyErr.stack);
        if (frames.length) {
          context.stack = frames;
          // first non-internal frame as origin
          const origin = frames.find((f) => !this.isInternalFrame(f.file));
          if (origin) context.origin = origin;
        }
      }

      if (anyErr?.config) {
        context.url = anyErr.config.url || anyErr.config.baseURL || undefined;
        context.method = anyErr.config.method;
      }

      if (anyErr?.response) {
        const status = anyErr.response.status || SHARED_ERRORS.DEFAULT_STATUS;
        const message =
          anyErr.response.data?.message ||
          anyErr.message ||
          SHARED_ERROR_MESSAGES.UPSTREAM_ERROR;
        return new BaseAppError({
          message,
          status,
          code: anyErr.code ?? undefined,
          context,
        } as BaseAppErrorParams);
      }

      if (anyErr?.request) {
        // no response received
        return new BaseAppError({
          message: SHARED_ERROR_MESSAGES.NO_RESPONSE,
          status: SHARED_ERRORS.DEFAULT_STATUS,
          code: anyErr.code ?? undefined,
          context,
        } as BaseAppErrorParams);
      }

      // Fallback generic error
      return new BaseAppError({
        message:
          (anyErr && anyErr.message) || SHARED_ERROR_MESSAGES.UNEXPECTED_ERROR,
        status: SHARED_ERRORS.INTERNAL_STATUS,
        code: anyErr?.code,
        context,
      } as BaseAppErrorParams);
    } catch (e) {
      return new BaseAppError({
        message: SHARED_ERROR_MESSAGES.MAPPING_FAILURE,
        status: SHARED_ERRORS.INTERNAL_STATUS,
        context: { original: String(err) },
      } as BaseAppErrorParams);
    }
  }

  private parseStack(
    stack: string,
  ): Array<{ fn?: string; file?: string; line?: number; column?: number }> {
    const lines = stack
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const frames: Array<{
      fn?: string;
      file?: string;
      line?: number;
      column?: number;
    }> = [];
    const re = /^at\s+(?:(.*?)\s+\()?(.*?):(\d+):(\d+)\)?$/;
    for (const line of lines) {
      const m = re.exec(line);
      if (m) {
        const fn = m[1] || undefined;
        const file = m[2];
        const lineNum = parseInt(m[3], 10);
        const colNum = parseInt(m[4], 10);
        frames.push({ fn, file, line: lineNum, column: colNum });
      }
    }
    return frames;
  }

  private isInternalFrame(file?: string): boolean {
    if (!file) return false;
    return SHARED_INTERNAL_FRAME_RE.test(file);
  }
}
