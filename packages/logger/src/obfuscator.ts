import {
  Obfuscator,
  SensitiveEntry,
} from "./implementations/winston/winston.logger.types";
import { DEFAULT_SENSITIVE_KEYS } from "./logger.constant";

function isObject(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function maskString(s: string) {
  if (s.length <= 4) return "****";
  return s.slice(0, 2) + "****" + s.slice(-2);
}

function normalizeEntries(entries?: SensitiveEntry[]) {
  const keys: string[] = [];
  const custom = new Map<string, Obfuscator>();
  if (!entries || entries.length === 0) return { keys, custom };
  for (const e of entries) {
    if (typeof e === "string") {
      keys.push(e);
    } else if (
      e &&
      typeof e === "object" &&
      "key" in e &&
      typeof e.key === "string" &&
      typeof e.obfuscator === "function"
    ) {
      custom.set(e.key.toLowerCase(), e.obfuscator);
    }
  }
  return { keys, custom };
}

export function defaultObfuscator(obj: any, entries?: SensitiveEntry[]): any {
  if (obj == null) return obj;
  if (Array.isArray(obj)) {
    return obj.map((v) => defaultObfuscator(v, entries));
  }
  if (!isObject(obj)) return obj;

  const { keys: extraKeys, custom } = normalizeEntries(entries);
  const keys = DEFAULT_SENSITIVE_KEYS.concat(extraKeys || []);

  const out: any = {};
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const lower = k.toLowerCase();
    if (custom.has(lower)) {
      try {
        out[k] = custom.get(lower)!(val);
      } catch (e) {
        out[k] = "****";
      }
    } else if (keys.some((s) => lower.includes(s.toLowerCase()))) {
      // mask value using default strategy
      if (typeof val === "string") out[k] = maskString(val);
      else out[k] = "****";
    } else if (isObject(val) || Array.isArray(val)) {
      out[k] = defaultObfuscator(val, entries);
    } else {
      out[k] = val;
    }
  }
  return out;
}

export function buildDefaultObfuscator(
  additional?: SensitiveEntry[],
): Obfuscator {
  return (v: any) => defaultObfuscator(v, additional);
}
