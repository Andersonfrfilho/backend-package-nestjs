import {
  HTTP_ERRORS,
  HTTP_ERROR_MESSAGES,
  INTERNAL_FRAME_RE,
} from "./errors.constants";
import type { ErrorContext } from "./errors.interfaces";

export class ErrorMapperService {
  mapUpstreamError(err: unknown) {
    if (
      err &&
      typeof (err as Record<string, unknown>).status !== "undefined" &&
      typeof (err as Record<string, unknown>).message !== "undefined"
    )
      return err;

    try {
      const obj = (err as Record<string, unknown>) ?? {};
      const context: ErrorContext = {};

      if (obj?.config && typeof obj.config === "object") {
        const cfg = obj.config as Record<string, unknown>;
        context.url = (cfg.url as string) || (cfg.baseURL as string);
        context.method = cfg.method as string | undefined;
      }

      if (obj?.stack && typeof obj.stack === "string") {
        const frames = this.parseStack(obj.stack);
        if (frames.length) {
          context.stack = frames as unknown as ErrorContext["stack"];
          const origin = frames.find((f) => !this.isInternalFrame(f.file));
          if (origin)
            context.origin = origin as unknown as ErrorContext["origin"];
        }
      }

      if (obj?.response && typeof obj.response === "object") {
        const resp = obj.response as Record<string, unknown>;
        const status =
          typeof resp.status === "number"
            ? (resp.status as number)
            : HTTP_ERRORS.DEFAULT_STATUS;
        const message =
          (resp.data &&
            ((resp.data as Record<string, unknown>).message as string)) ||
          (obj.message as string) ||
          HTTP_ERROR_MESSAGES.UPSTREAM_ERROR;
        return {
          message,
          status,
          code: obj.code as string | undefined,
          context: {
            ...context,
            data: resp.data,
          },
        };
      }

      if (obj?.request) {
        return {
          message: HTTP_ERROR_MESSAGES.NO_RESPONSE,
          status: HTTP_ERRORS.DEFAULT_STATUS,
          code: obj.code as string | undefined,
          context,
        };
      }

      return {
        message:
          (obj && (obj.message as string)) ||
          HTTP_ERROR_MESSAGES.UNEXPECTED_ERROR,
        status: HTTP_ERRORS.INTERNAL_STATUS,
        code: obj?.code as string | undefined,
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

  private isInternalFrame(file?: string) {
    if (!file) return false;
    return INTERNAL_FRAME_RE.test(file);
  }
}
