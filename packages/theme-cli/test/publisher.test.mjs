import assert from "node:assert/strict";
import { createPublicKey, publicEncrypt } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import test from "node:test";
import { prepareThemeDraft, publishThemePack, publishThemeSession, MAX_PUBLISH_ARCHIVE_BYTES, PUBLISH_VALIDATOR_VERSION } from "../src/publisher.mjs";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";
const submissionCode = `gctp_${sessionId}.${"a".repeat(43)}`;
const buildCode = `gctb_${sessionId}.${"b".repeat(43)}`;

test("submits a review draft with a build-only capability", async () => {
  const calls = [];
  const result = await prepareThemeDraft("theme", {
    registryUrl: "http://localhost:4173",
    buildCode,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ session: { status: "draft_ready" }, draft: { digest: "c".repeat(64) } });
    },
    createDraft: async () => ({ manifest: { schemaVersion: 2 }, previews: {}, previewEvidence: {}, validation: { errors: [] } }),
  });
  assert.equal(result.session.status, "draft_ready");
  assert.equal(new URL(calls[0].url).pathname, `/api/publish/sessions/${sessionId}/build`);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${buildCode}`);
  assert.ok(!calls[0].url.includes(buildCode));
  assert.equal(JSON.parse(calls[0].init.body).validatorVersion, PUBLISH_VALIDATOR_VERSION);
});

test("does not accept a build code for final publication", async () => {
  await assert.rejects(publishThemePack("theme", {
    registryUrl: "http://localhost:4173",
    submissionCode: buildCode,
    createArchive: async () => { throw new Error("must not be reached"); },
  }), /requires a publish code/);
});

test("uses one agent session from private draft through confirmed publication", async () => {
  const calls = [];
  let continuationPolls = 0;
  let draftReadyCount = 0;
  const fetchImpl = async (url, init) => {
    const pathname = new URL(url).pathname;
    calls.push({ pathname, init });
    if (pathname.endsWith("/build")) {
      const body = JSON.parse(init.body);
      const publicKey = createPublicKey({ key: body.agentPublicKey, format: "jwk" });
      const envelope = publicEncrypt({ key: publicKey, oaepHash: "sha256" }, Buffer.from(submissionCode)).toString("base64url");
      fetchImpl.envelope = envelope;
      return Response.json({ session: { status: "draft_ready", themeId: "safe-theme", version: "1.0.0" }, draft: { digest: "c".repeat(64) } });
    }
    if (pathname.endsWith("/continue")) {
      continuationPolls += 1;
      return continuationPolls === 1
        ? Response.json({ state: "waiting_for_confirmation" }, { status: 202 })
        : Response.json({ state: "authorized", algorithm: "RSA-OAEP-256", envelope: fetchImpl.envelope });
    }
    if (pathname.endsWith("/preflight")) return Response.json({ session: { status: "preflight_passed" } });
    if (pathname.endsWith("/archive")) return Response.json({ session: { status: "uploaded" } });
    if (pathname.endsWith("/finalize")) return Response.json({ session: { status: "published", themeId: "safe-theme", version: "1.0.0" }, submission: { id: "submission" } });
    throw new Error(`Unexpected request: ${pathname}`);
  };
  const result = await publishThemeSession("theme", {
    registryUrl: "http://localhost:4173",
    buildCode,
    fetchImpl,
    wait: async () => undefined,
    pollIntervalMs: 0,
    maxWaitMs: 1_000,
    onDraftReady: async () => { draftReadyCount += 1; },
    createDraft: async () => ({ manifest: { schemaVersion: 2 }, previews: {}, previewEvidence: {}, validation: { errors: [] } }),
    createArchive: async (_input, { outputPath }) => {
      await writeFile(outputPath, new Uint8Array([0x50, 0x4b, 3, 4]));
      return { archivePath: outputPath, themeId: "safe-theme", version: "1.0.0", sha256: "b".repeat(64), bytes: 4 };
    },
  });

  assert.equal(result.session.status, "published");
  assert.equal(draftReadyCount, 1);
  assert.equal(continuationPolls, 2);
  assert.deepEqual(calls.map((call) => call.pathname), [
    `/api/publish/sessions/${sessionId}/build`,
    `/api/publish/sessions/${sessionId}/continue`,
    `/api/publish/sessions/${sessionId}/continue`,
    `/api/publish/sessions/${sessionId}/preflight`,
    `/api/publish/sessions/${sessionId}/archive`,
    `/api/publish/sessions/${sessionId}/finalize`,
  ]);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${buildCode}`);
  assert.equal(calls[1].init.headers.Authorization, `Bearer ${buildCode}`);
  assert.equal(calls[3].init.headers.Authorization, `Bearer ${submissionCode}`);
});

test("publishes through preflight, quarantine upload, and final validation without putting the code in a URL", async () => {
  const calls = [];
  let temporaryArchive;
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    const response = calls.length === 3
      ? { session: { status: "published", themeId: "safe-theme", version: "1.0.0" }, submission: { id: "submission" } }
      : { session: { status: calls.length === 1 ? "preflight_passed" : "uploaded" } };
    return Response.json(response);
  };
  const result = await publishThemePack("theme", {
    registryUrl: "http://localhost:4173",
    submissionCode,
    fetchImpl,
    createArchive: async (_input, { outputPath }) => {
      temporaryArchive = outputPath;
      await writeFile(outputPath, new Uint8Array([0x50, 0x4b, 3, 4]));
      return { archivePath: outputPath, themeId: "safe-theme", version: "1.0.0", sha256: "b".repeat(64), bytes: 4 };
    },
  });

  assert.equal(result.session.status, "published");
  assert.deepEqual(calls.map((call) => [new URL(call.url).pathname, call.init.method]), [
    [`/api/publish/sessions/${sessionId}/preflight`, "POST"],
    [`/api/publish/sessions/${sessionId}/archive`, "PUT"],
    [`/api/publish/sessions/${sessionId}/finalize`, "POST"],
  ]);
  for (const call of calls) {
    assert.ok(!call.url.includes(submissionCode));
    assert.equal(call.init.headers.Authorization, `Bearer ${submissionCode}`);
    assert.equal(call.init.redirect, "error");
  }
  const preflight = JSON.parse(calls[0].init.body);
  assert.equal(preflight.validatorVersion, PUBLISH_VALIDATOR_VERSION);
  assert.equal(calls[1].init.headers["Content-Type"], "application/zip");
  await assert.rejects(access(temporaryArchive));
});

test("rejects insecure non-loopback registries before creating an archive", async () => {
  let created = false;
  await assert.rejects(publishThemePack("theme", {
    registryUrl: "http://registry.example",
    submissionCode,
    createArchive: async () => { created = true; },
  }), /must use HTTPS/);
  assert.equal(created, false);
});

test("never sends a submission code to a non-official HTTPS host", async () => {
  await assert.rejects(publishThemePack("theme", {
    registryUrl: "https://upload.example",
    submissionCode,
    createArchive: async () => { throw new Error("must not be reached"); },
  }), /only to Get Codex Theme/);
});

test("cleans temporary archives when a server phase fails", async () => {
  let temporaryArchive;
  await assert.rejects(publishThemePack("theme", {
    registryUrl: "https://getcodextheme.com",
    submissionCode,
    fetchImpl: async () => Response.json({ error: { message: "Rejected safely." }, validation: { errors: ["Unsafe path"] } }, { status: 422 }),
    createArchive: async (_input, { outputPath }) => {
      temporaryArchive = outputPath;
      await writeFile(outputPath, new Uint8Array([0x50, 0x4b, 3, 4]));
      return { archivePath: outputPath, themeId: "safe-theme", version: "1.0.0", sha256: "b".repeat(64), bytes: 4 };
    },
  }), /Rejected safely[\s\S]*Unsafe path/);
  await assert.rejects(access(temporaryArchive));
});

test("refuses an archive larger than the server publication limit", async () => {
  await assert.rejects(publishThemePack("theme", {
    registryUrl: "https://getcodextheme.com",
    submissionCode,
    createArchive: async () => ({ archivePath: "/unused", themeId: "safe-theme", version: "1.0.0", sha256: "b".repeat(64), bytes: MAX_PUBLISH_ARCHIVE_BYTES + 1 }),
  }), /no larger than 24 MB/);
});
