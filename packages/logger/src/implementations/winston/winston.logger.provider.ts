import { Logger as WinstonLoggerType } from "winston";
import type {
  LogPayload,
  LoggerProviderInterface,
} from "../../logger.interface";
import { Obfuscator } from "./winston.logger.types";
import { getContext } from "../../context/async-context.service";

export class WinstonLoggerProvider implements LoggerProviderInterface {
  private context?: string;

  constructor(
    private readonly logger: WinstonLoggerType,
    private readonly obfuscator?: Obfuscator,
  ) {}

  debug(payload: LogPayload): void {
    this.log("debug", payload);
  }
  info(payload: LogPayload): void {
    this.log("info", payload);
  }
  warn(payload: LogPayload): void {
    this.log("warn", payload);
  }
  error(payload: LogPayload): void {
    this.log("error", payload);
  }
  setContext(context: string): void {
    this.context = context;
  }

  private log(level: string, payload: LogPayload) {
    const msg = payload?.message ?? "";
    const messageContext = payload?.context ?? this.context;
    const messageMeta = payload?.meta;

    const safeMeta = this.obfuscator ? this.obfuscator(messageMeta) : messageMeta;

    const ctx = getContext();
    const requestId = messageMeta?.requestId ?? ctx?.requestId;
    const metaWithRequest = Object.assign({}, safeMeta ?? {}, requestId ? { requestId } : {});

    if (messageContext) {
      this.logger.log(level as any, msg, { context: messageContext, meta: metaWithRequest });
    } else {
      this.logger.log(level as any, msg, { meta: metaWithRequest });
    }
  }
}
