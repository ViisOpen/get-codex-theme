import { RequestError } from "./http";

export function createOpaqueToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64Url(data);
}

export function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256BytesHex(value: Uint8Array) {
  const data = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safeOrigin(request: Request, configuredOrigin?: string) {
  const requestUrl = new URL(request.url);
  if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1" || requestUrl.hostname === "::1") {
    return requestUrl.origin;
  }
  if (configuredOrigin) {
    const configured = new URL(configuredOrigin);
    if (configured.protocol !== "https:" && configured.hostname !== "localhost") {
      throw new Error("SITE_URL must use HTTPS.");
    }
    return configured.origin;
  }
  return requestUrl.origin;
}

export function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function requireTrustedBrowserMutation(request: Request, expectedOrigin: string) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new RequestError(403, "cross_site_request", "Cross-site publishing requests are not allowed.");
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== expectedOrigin) {
    throw new RequestError(403, "invalid_origin", "This publishing request came from an untrusted origin.");
  }
}
