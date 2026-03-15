export class ErrorMapperService {
  mapUpstreamError(err: unknown) {
    if (err && (err as any).status && (err as any).message) return err;

    try {
      const anyErr: any = err as any;
      const context: any = {};

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
        const status = anyErr.response.status || 502;
        const message = anyErr.response.data?.message || anyErr.message || 'Upstream error';
        return { message, status, code: anyErr.code, context };
      }

      if (anyErr?.request) {
        return { message: 'No response from upstream service', status: 502, code: anyErr.code, context };
      }

      return { message: (anyErr && anyErr.message) || 'Unexpected error', status: 500, code: anyErr?.code, context };
    } catch (e) {
      return { message: 'Error mapping failure', status: 500, code: undefined, context: { original: String(err) } };
    }
  }

  private parseStack(stack: string) {
    const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);
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
    return /node_modules|internal|axios/.test(file);
  }
}
