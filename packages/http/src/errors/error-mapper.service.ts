import {
  HTTP_ERRORS,
  HTTP_ERROR_MESSAGES,
  INTERNAL_FRAME_RE,
} from "./errors.constants";
import type { ErrorContext } from "./errors.interfaces";

export class ErrorMapperService {
  mapUpstreamError(err: unknown) {
    if (err && (err as any).status && (err as any).message) return err;

    try {
      const anyErr: any = err as any;
      const context: ErrorContext = {};

      if (anyErr?.config) {
        context.url = anyErr.config.url || anyErr.config.baseURL;
        context.method = anyErr.config.method;
      }

      if (anyErr?.stack) {
        const frames = this.parseStack(anyErr.stack);
        if (frames.length) {
          context.stack = frames;
          const origin = frames.find((f) => !this.isInternalFrame(f.file));
          if (origin) context.origin = origin;
        }
      }

      if (anyErr?.response) {
        const status = anyErr.response.status || HTTP_ERRORS.DEFAULT_STATUS;
        const message =
          anyErr.response.data?.message ||
          anyErr.message ||
          HTTP_ERROR_MESSAGES.UPSTREAM_ERROR;
        return { message, status, code: anyErr.code, context };
      }

      if (anyErr?.request) {
        return {
          message: HTTP_ERROR_MESSAGES.NO_RESPONSE,
          status: HTTP_ERRORS.DEFAULT_STATUS,
          code: anyErr.code,
          context,
        };
      }

      return {
        message:
          (anyErr && anyErr.message) || HTTP_ERROR_MESSAGES.UNEXPECTED_ERROR,
        status: HTTP_ERRORS.INTERNAL_STATUS,
        code: anyErr?.code,
        context,
      };
    } catch (e) {
      return {
        message: HTTP_ERROR_MESSAGES.MAPPING_FAILURE,
        status: HTTP_ERRORS.INTERNAL_STATUS,
        code: undefined,
        context: { original: String(err) },
      };
    }
  }

  private parseStack(stack: string) {
    const lines = stack
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const frames: Array<any> = [];
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

  private isInternalFrame(file?: string) {
    if (!file) return false;
    return INTERNAL_FRAME_RE.test(file);
  }
}
