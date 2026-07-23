const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
} as const;

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });
}

export function apiError(status: number, code: string, message: string) {
  return json({ error: { code, message } }, { status });
}

export async function readJsonObject(request: Request, maxBytes = 32_768) {
  const raw = new TextDecoder().decode(await readBodyBytes(request, maxBytes));

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new RequestError(400, "invalid_json", "Send a valid JSON object.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError(400, "invalid_payload", "Send a JSON object.");
  }
  return value as Record<string, unknown>;
}

export async function readBodyBytes(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) throw new RequestError(413, "payload_too_large", "The request payload is too large.");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("payload_too_large");
        throw new RequestError(413, "payload_too_large", "The request payload is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export class RequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof RequestError) {
    return apiError(error.status, error.code, error.message);
  }
  console.error(JSON.stringify({ level: "error", message: "API request failed", error: error instanceof Error ? error.message : String(error) }));
  return apiError(500, "internal_error", "Something went wrong. Please try again.");
}
