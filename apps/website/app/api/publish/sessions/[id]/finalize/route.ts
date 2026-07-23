import { RequestError, json, toErrorResponse } from "../../../../_lib/http";
import { themeAssets } from "../../../../_lib/assets";
import { GALLERY_ASSET_NAMES, validateThemeSubmissionArchive } from "../../../../_lib/submission-validator";
import { DRAFT_PREVIEW_KEYS, draftAssetKeys, publishingDraftDigest, type DraftPreviewKey, type DraftPreviewRecord } from "../../../../_lib/publishing-draft";
import { sha256BytesHex } from "../../../../_lib/security";
import {
  authenticatePublishCapability,
  claimThemeNamespace,
  countRecentCompletedSessions,
  findThemeOwner,
  publishSessionAuthorName,
  publishSessionAuthorProfiles,
  publicPublishSession,
  recordValidationRun,
  updatePublishSession,
} from "../../../../_lib/publish-sessions";
import { createSubmission, findSubmissionByArchiveSha256, findSubmissionByThemeVersion, replaceSubmission } from "../../../../_lib/submissions";
import { getTheme } from "@/lib/themes";

const AUTO_PUBLISH_LICENSES = new Set(["MIT", "Apache-2.0", "CC0-1.0", "CC-BY-4.0"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const stagedKeys: string[] = [];
  let validationStarted = false;
  let quarantineKey: string | null = null;
  let draftKeys: string[] = [];
  let sessionId = "";
  try {
    const { id } = await context.params;
    sessionId = id;
    const session = await authenticatePublishCapability(request, id, { allowConsumed: true });
    draftKeys = draftAssetKeys(session.draftPreviewJson);
    if (session.publishTokenConsumedAt && ["published", "failed"].includes(session.status)) {
      return json({ session: publicPublishSession(session) });
    }
    if (session.status !== "uploaded" || !session.archiveKey) {
      throw new RequestError(409, "invalid_publish_state", `Final validation cannot run while the session is ${session.status}.`);
    }
    quarantineKey = session.archiveKey;
    validationStarted = true;
    await updatePublishSession(id, { status: "validating" });
    const stored = await themeAssets().get(session.archiveKey);
    if (!stored) throw new RequestError(409, "quarantine_archive_missing", "The quarantined ZIP is missing. Create a new publishing session.");
    const validation = await validateThemeSubmissionArchive(new Uint8Array(await stored.arrayBuffer()), { publishing: true });
    const errors = [...validation.errors];
    if (validation.manifest && (validation.manifest.id !== session.themeId || validation.manifest.version !== session.themeVersion)) {
      errors.push("The server-read manifest identity does not match the archive that passed preflight.");
    }
    const authorProfiles = publishSessionAuthorProfiles(session);
    const expectedAuthor = publishSessionAuthorName(session);
    if (validation.manifest && (!expectedAuthor || validation.manifest.author !== expectedAuthor)) {
      errors.push(`manifest.author must exactly match the social identity saved to this publishing session: ${expectedAuthor ?? "unknown"}.`);
    }
    if (validation.manifest && validation.galleryAssets) {
      try {
        const draftPreviews = JSON.parse(session.draftPreviewJson) as Record<DraftPreviewKey, DraftPreviewRecord>;
        for (const assetKey of DRAFT_PREVIEW_KEYS) {
          const draft = draftPreviews[assetKey];
          const published = validation.galleryAssets[assetKey];
          if (!draft || !published || draft.file !== validation.manifest.assets[assetKey] || draft.sha256 !== await sha256BytesHex(published.bytes)) {
            errors.push(`The final ${assetKey} does not match the author-confirmed draft.`);
          }
        }
        const finalDigest = await publishingDraftDigest({
          manifest: validation.manifest,
          previews: draftPreviews,
          category: session.category,
          authorProfiles,
        });
        if (!session.confirmedDraftDigest || finalDigest !== session.confirmedDraftDigest) errors.push("The final theme does not match the author-confirmed draft digest.");
      } catch {
        errors.push("The author-confirmed draft evidence is missing or invalid.");
      }
    }
    if (!validation.valid || !validation.manifest || !validation.archive || !validation.sha256 || errors.length) {
      const result = { errors: [...new Set(errors)], warnings: validation.warnings, coverage: validation.coverage ?? {} };
      await recordValidationRun({ sessionId: id, phase: "server", valid: false, archiveSha256: session.expectedSha256, ...result });
      await updatePublishSession(id, {
        status: "failed",
        riskLevel: "blocked",
        decisionReason: "The server-side archive validation failed.",
        validationJson: JSON.stringify(result),
        publishTokenConsumedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      await themeAssets().delete(session.archiveKey).catch(() => undefined);
      if (draftKeys.length) await themeAssets().delete(draftKeys).catch(() => undefined);
      return json({
        error: { code: "server_validation_failed", message: "The server rejected the uploaded theme pack." },
        session: publicPublishSession({
          ...session,
          status: "failed",
          riskLevel: "blocked",
          decisionReason: "The server-side archive validation failed.",
          validationJson: JSON.stringify(result),
          publishTokenConsumedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }),
        validation: result,
      }, { status: 422 });
    }

    const manifest = validation.manifest;
    await recordValidationRun({ sessionId: id, phase: "server", valid: true, archiveSha256: validation.sha256, warnings: validation.warnings, coverage: validation.coverage });
    if (getTheme(manifest.id)) throw new RequestError(409, "theme_id_reserved", "That theme id belongs to a first-party theme. Choose a different id.");
    const owner = await findThemeOwner(manifest.id);
    if (owner && owner !== session.publisherId) throw new RequestError(409, "theme_id_claimed", "That theme id is already owned by another publisher.");
    const existing = await findSubmissionByThemeVersion(manifest.id, manifest.version);
    if (existing && existing.publisherId !== session.publisherId) throw new RequestError(409, "theme_version_claimed", "That theme id and version have already been submitted by another publisher.");
    if (existing?.status === "published") throw new RequestError(409, "theme_version_published", "Published versions are immutable. Increase the semantic version and submit again.");
    const duplicate = await findSubmissionByArchiveSha256(validation.sha256);
    const recentCompleted = await countRecentCompletedSessions(session.publisherId);
    if (duplicate && duplicate.id !== existing?.id) {
      throw new RequestError(409, "duplicate_release", `This validated archive already belongs to ${duplicate.themeId}@${duplicate.version}.`);
    }
    if (recentCompleted >= 3) {
      throw new RequestError(429, "publish_rate_limited", "Too many releases were completed recently. Try again later.");
    }
    if (!AUTO_PUBLISH_LICENSES.has(manifest.license)) {
      throw new RequestError(422, "unsupported_publication_license", `License ${manifest.license} is not supported for automatic Registry publication.`);
    }
    await claimThemeNamespace(manifest.id, session.publisherId);

    const submissionId = existing?.id ?? crypto.randomUUID();
    const baseKey = `registry/${manifest.id}/${manifest.version}`;
    const archiveKey = `${baseKey}.zip`;
    await themeAssets().put(archiveKey, validation.archive, {
      httpMetadata: { contentType: "application/zip" },
      customMetadata: {
        source: "agent-publish-validated",
        themeId: manifest.id,
        version: manifest.version,
        publisherId: session.publisherId,
        sessionId: id,
        sha256: validation.sha256,
      },
    });
    stagedKeys.push(archiveKey);
    const galleryAssets: Record<string, { key: string; contentType: string }> = {};
    for (const name of GALLERY_ASSET_NAMES) {
      const asset = validation.galleryAssets?.[name];
      if (!asset) continue;
      const key = `registry/${manifest.id}/${manifest.version}/gallery/${name}.${asset.extension}`;
      await themeAssets().put(key, asset.bytes, {
        httpMetadata: { contentType: asset.contentType },
        customMetadata: { source: "agent-publish-gallery", themeId: manifest.id, version: manifest.version, publisherId: session.publisherId, sessionId: id, asset: name },
      });
      stagedKeys.push(key);
      galleryAssets[name] = { key, contentType: asset.contentType };
    }

    const now = new Date().toISOString();
    const validationSummary = { errors: [], warnings: validation.warnings, coverage: validation.coverage ?? {} };
    const values = {
      publisherId: session.publisherId,
      publisherEmail: session.publisherEmail,
      themeId: manifest.id,
      version: manifest.version,
      name: manifest.name,
      description: manifest.description,
      tagline: manifest.tagline,
      designStory: manifest.designStory,
      author: expectedAuthor as string,
      authorPlatform: session.authorPlatform,
      authorUrl: session.authorUrl,
      authorProfilesJson: JSON.stringify(authorProfiles),
      category: session.category,
      mode: manifest.mode,
      license: manifest.license,
      status: "published" as const,
      archiveKey,
      archiveSha256: validation.sha256,
      archiveBytes: validation.archive.byteLength,
      manifestJson: JSON.stringify(manifest),
      validationJson: JSON.stringify(validationSummary),
      galleryAssetsJson: JSON.stringify(galleryAssets),
      decisionNotes: null,
      processedAt: null,
      publishedAt: now,
    };
    if (existing) {
      await replaceSubmission(existing.id, values);
      const obsolete = [existing.archiveKey, ...Object.values(parseGalleryAssets(existing.galleryAssetsJson)).map((asset) => asset.key)]
        .filter((key) => key !== archiveKey && !stagedKeys.includes(key));
      if (obsolete.length) await themeAssets().delete(obsolete);
    } else {
      try { await createSubmission({ id: submissionId, ...values }); }
      catch (error) {
        if (/unique|constraint/i.test(error instanceof Error ? error.message : String(error))) {
          throw new RequestError(409, "theme_version_claimed", "That theme id and version was claimed by another request. Increase the semantic version and retry.");
        }
        throw error;
      }
    }
    const finalStatus = "published" as const;
    const decisionReason = "Automatically published after authoritative server validation.";
    await updatePublishSession(id, {
      status: finalStatus,
      riskLevel: "low",
      decisionReason,
      validationJson: JSON.stringify(validationSummary),
      archiveKey,
      archiveBytes: validation.archive.byteLength,
      publishTokenConsumedAt: now,
      completedAt: now,
    });
    stagedKeys.length = 0;
    await themeAssets().delete(quarantineKey).catch(() => undefined);
    if (draftKeys.length) await themeAssets().delete(draftKeys).catch(() => undefined);
    return json({
      session: publicPublishSession({
        ...session,
        status: finalStatus,
        riskLevel: "low",
        decisionReason,
        validationJson: JSON.stringify(validationSummary),
        archiveKey,
        archiveBytes: validation.archive.byteLength,
        publishTokenConsumedAt: now,
        completedAt: now,
      }),
      submission: { id: submissionId, themeId: manifest.id, version: manifest.version, status: values.status },
      validation: validationSummary,
    }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (stagedKeys.length) await themeAssets().delete(stagedKeys).catch(() => undefined);
    if (validationStarted && sessionId && !(error instanceof RequestError && error.code === "server_validation_failed")) {
      const now = new Date().toISOString();
      await updatePublishSession(sessionId, {
        status: "failed",
        riskLevel: "blocked",
        decisionReason: "The server could not safely complete publication.",
        publishTokenConsumedAt: now,
        completedAt: now,
      }).catch(() => undefined);
      if (quarantineKey) await themeAssets().delete(quarantineKey).catch(() => undefined);
      if (draftKeys.length) await themeAssets().delete(draftKeys).catch(() => undefined);
    }
    return toErrorResponse(error);
  }
}

function parseGalleryAssets(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, { key?: unknown; contentType?: unknown }>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, { key: string; contentType?: unknown }] => typeof entry[1]?.key === "string"));
  } catch { return {}; }
}
