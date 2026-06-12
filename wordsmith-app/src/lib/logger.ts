import { randomUUID } from "crypto";

type LogFields = Record<string, unknown>;

function emit(
  level: "info" | "error",
  route: string,
  msg: string,
  fields: LogFields
): void {
  const line = JSON.stringify({
    level,
    route,
    msg,
    ts: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

export interface RequestLogger {
  requestId: string;
  info: (msg: string, fields?: LogFields) => void;
  error: (msg: string, err?: unknown, fields?: LogFields) => void;
  latencyMs: () => number;
}

/** One per request — stamps every line with the route and a request id. */
export function createRequestLogger(route: string, userId?: string): RequestLogger {
  const requestId = randomUUID();
  const start = Date.now();
  const base: LogFields = userId ? { requestId, userId } : { requestId };

  return {
    requestId,
    info: (msg, fields = {}) => emit("info", route, msg, { ...base, ...fields }),
    error: (msg, err, fields = {}) =>
      emit("error", route, msg, {
        ...base,
        ...fields,
        err: err instanceof Error ? err.message : err === undefined ? undefined : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }),
    latencyMs: () => Date.now() - start,
  };
}
