import {
  Obfuscator,
  SensitiveEntry,
} from "./implementations/winston/winston.logger.types";
import { DefaultObfuscatorParams } from "./obfuscator.types";
import { DEFAULT_SENSITIVE_KEYS, MASK } from "./logger.constant";

function isObject(value: unknown) {
  return (
    value !== null && typeof value === "object" && !Array.isArray(value as any)
  );
}

function maskString(str: string) {
  if (str.length <= MASK.MIN_LENGTH) return MASK.REPLACEMENT;
  return (
    str.slice(0, MASK.EDGE_CHARS) +
    MASK.REPLACEMENT +
    str.slice(-MASK.EDGE_CHARS)
  );
}

function normalizeEntries(entries?: SensitiveEntry[]) {
  const keys: string[] = [];
  const custom = new Map<string, Obfuscator>();
  if (!entries || entries.length === 0) return { keys, custom };
  for (const entry of entries) {
    if (typeof entry === "string") {
      keys.push(entry);
    } else if (
      entry &&
      typeof entry === "object" &&
      "key" in entry &&
      typeof entry.key === "string" &&
      typeof entry.obfuscator === "function"
    ) {
      custom.set(entry.key.toLowerCase(), entry.obfuscator);
    }
  }
  return { keys, custom };
}

export function defaultObfuscator(params: DefaultObfuscatorParams): unknown {
  const { obj, entries } = params;
  if (obj == null) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => defaultObfuscator({ obj: item, entries }));
  }
  if (!isObject(obj)) return obj;

  const { keys: extraKeys, custom } = normalizeEntries(entries);
  const keys = DEFAULT_SENSITIVE_KEYS.concat(extraKeys || []);

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const value = (obj as Record<string, unknown>)[key];
    const lowerKey = key.toLowerCase();
    if (custom.has(lowerKey)) {
      try {
        out[key] = custom.get(lowerKey)!(value);
      } catch (error) {
        out[key] = MASK.REPLACEMENT;
      }
    } else if (keys.some((s) => lowerKey.includes(s.toLowerCase()))) {
      // mask value using default strategy
      if (typeof value === "string") out[key] = maskString(value);
      else out[key] = MASK.REPLACEMENT;
    } else if (isObject(value) || Array.isArray(value)) {
      out[key] = defaultObfuscator({ obj: value, entries });
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function buildDefaultObfuscator(
  additional?: SensitiveEntry[],
): Obfuscator {
  return (v: any) => defaultObfuscator({ obj: v, entries: additional });
}
