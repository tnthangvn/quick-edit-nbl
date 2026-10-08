import "server-only";

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function write(level: Level, fields: Fields, msg: string) {
  const line = { level, time: new Date().toISOString(), msg, ...serialize(fields) };
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(JSON.stringify(line));
}

function serialize(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v instanceof Error ? { name: v.name, message: v.message, stack: v.stack, cause: v.cause } : v;
  }
  return out;
}

/** Log JSON một dòng. Không log secret (token, cookie, API key). */
export const logger = {
  debug: (fields: Fields, msg: string) => process.env.NODE_ENV !== "production" && write("debug", fields, msg),
  info: (fields: Fields, msg: string) => write("info", fields, msg),
  warn: (fields: Fields, msg: string) => write("warn", fields, msg),
  error: (fields: Fields, msg: string) => write("error", fields, msg),
};
