import { RequestError, json, readJsonObject, toErrorResponse } from "../../../../_lib/http";
import { themeAssets } from "../../../../_lib/assets";
import { DRAFT_PREVIEW_KEYS, draftAssetKeys, publishingDraftDigest, type DraftPreviewKey, type DraftPreviewRecord } from "../../../../_lib/publishing-draft";
import {
  authenticateBuildCapability,
  findThemeOwner,
  MAX_BUILD_ATTEMPTS,
  normalizeAgentPublicKey,
  PUBLISH_VALIDATOR_VERSION,
  publicPublishSession,
  publishSessionAuthorName,
  publishSessionAuthorProfiles,
  recordValidationRun,
  updatePublishSession,
} from "../../../../_lib/publish-sessions";
import { inspectDraftPreview, validatePublishingManifest } from "../../../../_lib/submission-validator";
import { sha256BytesHex } from "../../../../_lib/security";
import { findSubmissionByThemeVersion } from "../../../../_lib/submissions";
import { getTheme } from "@/lib/themes";
import { inferThemeCategory } from "@/lib/theme-gallery";

const MAX_DRAFT_PAYLOAD_BYTES = 9 * 1024 * 1024;
const MAX_DRAFT_PREVIEW_BYTES = 2 * 1024 * 1024;
const SHA256_RE = /^[0-9a-f]{64}$/;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const stagedKeys: string[] = [];
  try {
    const { id } = await context.params;
    const session = await authenticateBuildCapability(request, id);
    if (session.status !== "build_created" && session.status !== "draft_ready") {
      throw new RequestError(409, "invalid_publish_state", `Build validation cannot run while the session is ${session.status}.`);
    }
    if (session.attemptCount >= MAX_BUILD_ATTEMPTS) throw new RequestError(429, "build_attempt_limit", "This build code has reached its three-attempt limit.");
    const payload = await readJsonObject(request, MAX_DRAFT_PAYLOAD_BYTES);
    const agentPublicKeyJson = payload.agentPublicKey === undefined
      ? session.agentPublicKeyJson
      : await normalizeAgentPublicKey(payload.agentPublicKey);
    if (session.agentPublicKeyJson && agentPublicKeyJson !== session.agentPublicKeyJson) {
      throw new RequestError(409, "agent_key_changed", "This publishing session is already bound to a different agent continuation key.");
    }
    const errors: string[] = [];
    const warnings = readStringArray((payload.validation as Record<string, unknown> | undefined)?.warnings);
    const localErrors = readStringArray((payload.validation as Record<string, unknown> | undefined)?.errors);
    if (payload.validatorVersion !== PUBLISH_VALIDATOR_VERSION) errors.push(`Update the publisher CLI: validator ${PUBLISH_VALIDATOR_VERSION} is required.`);
    if (localErrors.length) errors.push("The local strict validation report still contains errors.");

    const manifestValidation = validatePublishingManifest(payload.manifest);
    errors.push(...manifestValidation.errors);
    const manifest = manifestValidation.manifest;
    const previewPayload = payload.previews as Record<string, unknown> | undefined;
    const previewRecords = {} as Record<DraftPreviewKey, DraftPreviewRecord>;
    const previewBytes = new Map<DraftPreviewKey, Uint8Array>();
    let totalPreviewBytes = 0;
    if (manifest) {
      const expectedAuthor = publishSessionAuthorName(session);
      if (!expectedAuthor || manifest.author !== expectedAuthor) {
        errors.push(`manifest.author must exactly match the social identity saved to this publishing session: ${expectedAuthor ?? "unknown"}`);
      }
      for (const assetKey of DRAFT_PREVIEW_KEYS) {
        const item = previewPayload?.[assetKey] as Record<string, unknown> | undefined;
        try {
          if (!item || item.file !== manifest.assets[assetKey]) throw new Error(`${assetKey} must match its manifest asset path`);
          const bytes = decodeBase64(item.base64);
          totalPreviewBytes += bytes.byteLength;
          if (!bytes.byteLength || bytes.byteLength > MAX_DRAFT_PREVIEW_BYTES || totalPreviewBytes > 6 * 1024 * 1024) throw new Error(`${assetKey} exceeds the draft preview size limit`);
          const inspected = inspectDraftPreview(bytes, assetKey);
          const digest = await sha256BytesHex(bytes);
          if (item.sha256 !== digest || !SHA256_RE.test(digest)) throw new Error(`${assetKey} SHA-256 does not match its bytes`);
          if (item.contentType !== inspected.contentType || item.width !== inspected.width || item.height !== inspected.height) throw new Error(`${assetKey} metadata does not match its image`);
          const extension = inspected.contentType === "image/png" ? "png" : inspected.contentType === "image/webp" ? "webp" : "jpg";
          const key = `drafts/${session.publisherId}/${id}/${assetKey}.${extension}`;
          previewBytes.set(assetKey, bytes);
          previewRecords[assetKey] = { key, file: String(item.file), sha256: digest, width: inspected.width, height: inspected.height, contentType: inspected.contentType };
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `${assetKey} is invalid`);
        }
      }
      validateDraftEvidence(manifest.previewMetadata, payload.previewEvidence, previewRecords, errors);
      if (getTheme(manifest.id)) errors.push("That theme id belongs to a first-party theme. Choose a different id.");
      const owner = await findThemeOwner(manifest.id);
      if (owner && owner !== session.publisherId) errors.push("That theme id is already owned by another publisher.");
      const existing = await findSubmissionByThemeVersion(manifest.id, manifest.version);
      if (existing && existing.publisherId !== session.publisherId) errors.push("That theme id and version have already been submitted by another publisher.");
      if (existing?.status === "published") errors.push("Published versions are immutable. Increase the semantic version and try again.");
    }

    const uniqueErrors = [...new Set(errors)];
    const coverage = (payload.validation as Record<string, unknown> | undefined)?.coverage ?? {};
    await recordValidationRun({ sessionId: id, phase: "build", valid: uniqueErrors.length === 0, errors: uniqueErrors, warnings, coverage });
    if (!manifest || uniqueErrors.length) {
      await updatePublishSession(id, {
        status: "build_created",
        themeId: null,
        themeVersion: null,
        draftManifestJson: null,
        draftPreviewJson: "{}",
        draftDigest: null,
        confirmedDraftDigest: null,
        authorConfirmedAt: null,
        rightsConfirmedAt: null,
        publishTokenHash: null,
        publishTokenExpiresAt: null,
        publishTokenConsumedAt: null,
        agentPublicKeyJson,
        publishTokenEnvelope: null,
        attemptCount: session.attemptCount + 1,
        validationJson: JSON.stringify({ errors: uniqueErrors, warnings, coverage }),
      });
      const obsoleteDrafts = draftAssetKeys(session.draftPreviewJson);
      if (obsoleteDrafts.length) await themeAssets().delete(obsoleteDrafts).catch(() => undefined);
      return json({
        error: { code: "build_validation_failed", message: "The publishing draft did not pass server validation." },
        validation: { errors: uniqueErrors, warnings, coverage },
      }, { status: 422 });
    }

    const category = inferThemeCategory(manifest);
    const digest = await publishingDraftDigest({
      manifest,
      previews: previewRecords,
      category,
      authorProfiles: publishSessionAuthorProfiles(session),
    });
    for (const assetKey of DRAFT_PREVIEW_KEYS) {
      const record = previewRecords[assetKey];
      await themeAssets().put(record.key, previewBytes.get(assetKey) as Uint8Array, {
        httpMetadata: { contentType: record.contentType },
        customMetadata: { source: "agent-build-draft", sessionId: id, publisherId: session.publisherId, asset: assetKey, draftDigest: digest },
      });
      stagedKeys.push(record.key);
    }
    const validationJson = JSON.stringify({ errors: [], warnings, coverage });
    await updatePublishSession(id, {
      status: "draft_ready",
      category,
      themeId: manifest.id,
      themeVersion: manifest.version,
      draftManifestJson: JSON.stringify(manifest),
      draftPreviewJson: JSON.stringify(previewRecords),
      draftDigest: digest,
      confirmedDraftDigest: null,
      authorConfirmedAt: null,
      rightsConfirmedAt: null,
      publishTokenHash: null,
      publishTokenExpiresAt: null,
      publishTokenConsumedAt: null,
      agentPublicKeyJson,
      publishTokenEnvelope: null,
      expectedSha256: null,
      archiveBytes: null,
      attemptCount: session.attemptCount + 1,
      validationJson,
    });
    const currentKeys = new Set(Object.values(previewRecords).map((record) => record.key));
    const obsoleteDrafts = draftAssetKeys(session.draftPreviewJson).filter((key) => !currentKeys.has(key));
    if (obsoleteDrafts.length) await themeAssets().delete(obsoleteDrafts).catch(() => undefined);
    stagedKeys.length = 0;
    const updated = { ...session, status: "draft_ready" as const, category, themeId: manifest.id, themeVersion: manifest.version, draftManifestJson: JSON.stringify(manifest), draftPreviewJson: JSON.stringify(previewRecords), draftDigest: digest, attemptCount: session.attemptCount + 1, validationJson };
    return json({ session: publicPublishSession(updated), draft: publicPublishSession(updated).draft, validation: { errors: [], warnings, coverage } });
  } catch (error) {
    if (stagedKeys.length) await themeAssets().delete(stagedKeys).catch(() => undefined);
    return toErrorResponse(error);
  }
}

function decodeBase64(value: unknown) {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_DRAFT_PREVIEW_BYTES / 3) * 4 + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("Draft preview data is not valid base64");
  let binary: string;
  try { binary = atob(value); }
  catch { throw new Error("Draft preview data is not valid base64"); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 100) : [];
}

function validateDraftEvidence(
  metadata: { renderer?: string; rendererVersion?: string },
  evidence: unknown,
  previews: Partial<Record<DraftPreviewKey, DraftPreviewRecord>>,
  errors: string[],
) {
  const record = evidence as Record<string, unknown> | null;
  if (!record || typeof record !== "object" || Array.isArray(record)) return errors.push("Preview evidence is required for author confirmation.");
  if (metadata.renderer === "html-css") {
    if (record.renderer !== "get-codex-theme-html-css" || record.rendererVersion !== metadata.rendererVersion) errors.push("HTML/CSS preview evidence renderer and version must match previewMetadata.");
    const states = record.states as Record<string, Record<string, unknown>> | undefined;
    for (const [state, assetKey] of [["home", "screenshotHome"], ["task", "screenshotTask"], ["narrow", "screenshotNarrow"]] as const) {
      const preview = previews[assetKey];
      const stateRecord = states?.[state];
      if (!preview || !stateRecord || stateRecord.state !== state || stateRecord.file !== preview.file || stateRecord.sha256 !== preview.sha256 || stateRecord.width !== preview.width || stateRecord.height !== preview.height) {
        errors.push(`HTML/CSS preview evidence for ${state} does not match the submitted draft preview.`);
      }
    }
  } else if (metadata.renderer === "native-capture") {
    if (record.renderer !== "codex-native-cdp") errors.push("Native preview evidence must use the codex-native-cdp renderer contract.");
  }
}
