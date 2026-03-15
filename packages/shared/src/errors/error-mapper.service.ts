import { Injectable } from "@nestjs/common";
import { BaseAppError, ErrorContext } from "./base-app-error";

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
        const status = anyErr.response.status || 502;
        const message = anyErr.response.data?.message || anyErr.message || 'Upstream error';
        return new BaseAppError(message, status, anyErr.code ?? undefined, context);
      }

      if (anyErr?.request) {
        // no response received
        return new BaseAppError('No response from upstream service', 502, anyErr.code ?? undefined, context);
      }

      // Fallback generic error
      return new BaseAppError((anyErr && anyErr.message) || 'Unexpected error', 500, anyErr?.code, context);
    } catch (e) {
      return new BaseAppError('Error mapping failure', 500, undefined, { original: String(err) });
    }
  }

  private parseStack(stack: string): Array<{ fn?: string; file?: string; line?: number; column?: number }> {
    const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);
    const frames: Array<{ fn?: string; file?: string; line?: number; column?: number }> = [];
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
    return /node_modules|internal|\(internal|axios|packages\/http|@adatechnology\/http-client/.test(file);
  }
}
