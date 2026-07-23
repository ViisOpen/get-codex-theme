import { readFile, rm, mkdtemp } from "node:fs/promises";
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import os from "node:os";
import path from "node:path";

export const PUBLISH_VALIDATOR_VERSION = "2026-07-22.1";
export const MAX_PUBLISH_ARCHIVE_BYTES = 24 * 1024 * 1024;

export async function prepareThemeDraft(input, {
  registryUrl,
  buildCode,
  fetchImpl = fetch,
  createDraft,
  agentPublicKey,
} = {}) {
  if (typeof createDraft !== "function") throw new Error("A publishing draft builder is required.");
  const registry = secureRegistryUrl(registryUrl);
  const sessionId = sessionIdFromCode(buildCode, "gctb");
  const draft = await createDraft(input);
  const response = await requestJson(fetchImpl, new URL(`/api/publish/sessions/${sessionId}/build`, registry), {
    method: "POST",
    redirect: "error",
    headers: { "Authorization": `Bearer ${buildCode}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, validatorVersion: PUBLISH_VALIDATOR_VERSION, ...(agentPublicKey ? { agentPublicKey } : {}) }),
  }, "Build validation");
  return { session: response.session, draft: response.draft, validation: response.validation ?? null };
}

export async function publishThemeSession(input, {
  registryUrl,
  buildCode,
  fetchImpl = fetch,
  createDraft,
  createArchive,
  wait = defaultWait,
  pollIntervalMs = 2_500,
  maxWaitMs = 30 * 60 * 1_000,
  onDraftReady,
  keyPairFactory = createAgentContinuationKeyPair,
} = {}) {
  const { publicJwk, privateKey } = keyPairFactory();
  const prepared = await prepareThemeDraft(input, {
    registryUrl,
    buildCode,
    fetchImpl,
    createDraft,
    agentPublicKey: publicJwk,
  });
  await onDraftReady?.(prepared);
  const envelope = await waitForPublishAuthorization({
    registryUrl,
    buildCode,
    fetchImpl,
    wait,
    pollIntervalMs,
    maxWaitMs,
  });
  const submissionCode = decryptPublishEnvelope(envelope, privateKey);
  const published = await publishThemePack(input, {
    registryUrl,
    submissionCode,
    fetchImpl,
    createArchive,
  });
  return { draft: prepared.draft, draftValidation: prepared.validation, ...published };
}

export async function publishThemePack(input, {
  registryUrl,
  submissionCode,
  fetchImpl = fetch,
  createArchive,
} = {}) {
  if (typeof createArchive !== "function") throw new Error("A release archive builder is required.");
  const registry = secureRegistryUrl(registryUrl);
  const sessionId = sessionIdFromCode(submissionCode, "gctp");
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "get-codex-theme-publish-"));
  try {
    const archivePath = path.join(temporaryRoot, "submission.zip");
    const archive = await createArchive(input, { outputPath: archivePath });
    if (archive.bytes <= 0 || archive.bytes > MAX_PUBLISH_ARCHIVE_BYTES) {
      throw new Error(`The publishing ZIP must be no larger than ${MAX_PUBLISH_ARCHIVE_BYTES / 1024 / 1024} MB.`);
    }
    const authorization = `Bearer ${submissionCode}`;
    const base = new URL(`/api/publish/sessions/${sessionId}/`, registry);
    const preflight = await requestJson(fetchImpl, new URL("preflight", base), {
      method: "POST",
      redirect: "error",
      headers: { "Authorization": authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        themeId: archive.themeId,
        version: archive.version,
        archiveSha256: archive.sha256,
        archiveBytes: archive.bytes,
        validatorVersion: PUBLISH_VALIDATOR_VERSION,
      }),
    }, "Preflight");
    const bytes = new Uint8Array(await readFile(archive.archivePath));
    if (bytes.byteLength !== archive.bytes) throw new Error("The temporary ZIP changed after preflight.");
    await requestJson(fetchImpl, new URL("archive", base), {
      method: "PUT",
      redirect: "error",
      headers: { "Authorization": authorization, "Content-Type": "application/zip", "X-Archive-SHA256": archive.sha256 },
      body: bytes,
    }, "Upload");
    const finalized = await requestJson(fetchImpl, new URL("finalize", base), {
      method: "POST",
      redirect: "error",
      headers: { "Authorization": authorization },
    }, "Final validation");
    return {
      session: finalized.session,
      submission: finalized.submission ?? null,
      validation: finalized.validation ?? preflight.validation ?? null,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function readSubmissionCode(input = process.stdin) {
  if (!input || typeof input.on !== "function") throw new Error("Submission code stdin is unavailable.");
  const canUseRawMode = Boolean(input.isTTY && typeof input.setRawMode === "function");
  const wasRaw = input.isRaw;
  if (canUseRawMode) input.setRawMode(true);
  return new Promise((resolve, reject) => {
    let value = "";
    let finished = false;
    const cleanup = () => {
      input.off("data", onData);
      input.off("end", onEnd);
      input.off("error", onError);
      if (canUseRawMode) input.setRawMode(Boolean(wasRaw));
      input.pause?.();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup();
      const code = value.trim();
      try { sessionIdFromCode(code); resolve(code); }
      catch (error) { reject(error); }
    };
    const onData = (chunk) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      for (const character of text) {
        if (character === "\u0003") { finished = true; cleanup(); reject(new Error("Publishing cancelled.")); return; }
        if (character === "\n" || character === "\r") { finish(); return; }
        value += character;
        if (value.length > 200) { finished = true; cleanup(); reject(new Error("The submission code is invalid.")); return; }
      }
    };
    const onEnd = () => finish();
    const onError = (error) => { if (!finished) { finished = true; cleanup(); reject(error); } };
    input.on("data", onData);
    input.on("end", onEnd);
    input.on("error", onError);
    input.resume?.();
  });
}

function createAgentContinuationKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2_048, publicExponent: 0x10001 });
  const exported = publicKey.export({ format: "jwk" });
  return {
    publicJwk: {
      kty: "RSA",
      alg: "RSA-OAEP-256",
      e: exported.e,
      n: exported.n,
      ext: true,
      key_ops: ["encrypt"],
    },
    privateKey,
  };
}

async function waitForPublishAuthorization({
  registryUrl,
  buildCode,
  fetchImpl,
  wait,
  pollIntervalMs,
  maxWaitMs,
}) {
  const registry = secureRegistryUrl(registryUrl);
  const sessionId = sessionIdFromCode(buildCode, "gctb");
  const endpoint = new URL(`/api/publish/sessions/${sessionId}/continue`, registry);
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    const response = await requestJson(fetchImpl, endpoint, {
      method: "POST",
      redirect: "error",
      headers: { "Authorization": `Bearer ${buildCode}` },
    }, "Publish authorization");
    if (response.state === "authorized" && response.algorithm === "RSA-OAEP-256" && typeof response.envelope === "string") {
      return response.envelope;
    }
    if (response.state === "complete") {
      throw new Error(`The publishing session closed with status ${response.session?.status ?? "unknown"} before authorization.`);
    }
    if (response.state !== "waiting_for_confirmation") {
      throw new Error("The publishing server returned an invalid continuation state.");
    }
    await wait(pollIntervalMs);
  }
  throw new Error("Timed out waiting for website confirmation. Resume from the Publish portal with a new session.");
}

function decryptPublishEnvelope(envelope, privateKey) {
  if (!/^[A-Za-z0-9_-]{100,1024}$/.test(envelope)) throw new Error("The encrypted publish capability is invalid.");
  try {
    return privateDecrypt({
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, Buffer.from(envelope, "base64url")).toString("utf8");
  } catch {
    throw new Error("The encrypted publish capability could not be opened by this agent session.");
  }
}

function defaultWait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sessionIdFromCode(value, expectedPrefix) {
  const match = /^(gctb|gctp)_([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.[A-Za-z0-9_-]{32,100}$/i.exec(value ?? "");
  if (!match) throw new Error("The submission code is invalid.");
  if (expectedPrefix && match[1].toLowerCase() !== expectedPrefix) throw new Error(`This command requires a ${expectedPrefix === "gctb" ? "build" : "publish"} code.`);
  return match[2];
}

function secureRegistryUrl(value) {
  const url = new URL(value || "https://getcodextheme.com");
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const official = url.hostname === "getcodextheme.com" || url.hostname.endsWith(".getcodextheme.com");
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error("The publishing registry must use HTTPS; HTTP is allowed only on loopback during local development.");
  }
  if (!loopback && !official) throw new Error("Submission codes can be sent only to Get Codex Theme or a local loopback server.");
  url.username = "";
  url.password = "";
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function requestJson(fetchImpl, url, init, label) {
  let response;
  try { response = await fetchImpl(url, init); }
  catch (error) { throw new Error(`${label} request failed: ${error instanceof Error ? error.message : "network error"}`); }
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > 512 * 1024) throw new Error(`${label} returned an oversized response.`);
  const text = await readResponseText(response, 512 * 1024, label);
  let payload;
  try { payload = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`${label} returned an invalid response (HTTP ${response.status}).`); }
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string" ? payload.error.message : `${label} failed with HTTP ${response.status}.`;
    const validationErrors = Array.isArray(payload?.validation?.errors) ? payload.validation.errors.filter((item) => typeof item === "string") : [];
    throw new Error([message, ...validationErrors.map((item) => `- ${item}`)].join("\n"));
  }
  return payload;
}

async function readResponseText(response, maxBytes, label) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("response_too_large");
        throw new Error(`${label} returned an oversized response.`);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
