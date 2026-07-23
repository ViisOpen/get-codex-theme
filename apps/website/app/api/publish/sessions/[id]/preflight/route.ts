import { RequestError, json, readJsonObject, toErrorResponse } from "../../../../_lib/http";
import { MAX_THEME_ARCHIVE_BYTES } from "../../../../_lib/submission-validator";
import {
  authenticatePublishCapability,
  findThemeOwner,
  MAX_PUBLISH_ATTEMPTS,
  PUBLISH_VALIDATOR_VERSION,
  publicPublishSession,
  recordValidationRun,
  updatePublishSession,
} from "../../../../_lib/publish-sessions";
import { findSubmissionByThemeVersion } from "../../../../_lib/submissions";
import { getTheme } from "@/lib/themes";

const THEME_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await authenticatePublishCapability(request, id);
    if (session.status !== "publish_token_issued" && session.status !== "preflight_passed") {
      throw new RequestError(409, "invalid_publish_state", `Preflight cannot run while the session is ${session.status}.`);
    }
    if (!session.confirmedDraftDigest || !session.authorConfirmedAt || !session.rightsConfirmedAt) {
      throw new RequestError(409, "author_confirmation_required", "Confirm the current draft before publishing.");
    }
    if (session.attemptCount >= MAX_PUBLISH_ATTEMPTS) {
      throw new RequestError(429, "publish_attempt_limit", "This session has reached its three-attempt limit. Create a new session after fixing the pack.");
    }
    const payload = await readJsonObject(request, 32_768);
    const themeId = typeof payload.themeId === "string" ? payload.themeId : "";
    const version = typeof payload.version === "string" ? payload.version : "";
    const archiveSha256 = typeof payload.archiveSha256 === "string" ? payload.archiveSha256.toLowerCase() : "";
    const archiveBytes = typeof payload.archiveBytes === "number" ? payload.archiveBytes : -1;
    const validatorVersion = typeof payload.validatorVersion === "string" ? payload.validatorVersion : "";
    const errors: string[] = [];
    if (!THEME_ID_RE.test(themeId)) errors.push("manifest.id must use lowercase letters, numbers, and single hyphens.");
    if (!VERSION_RE.test(version)) errors.push("manifest.version must be a semantic x.y.z version.");
    if (!SHA256_RE.test(archiveSha256)) errors.push("The preflight archive SHA-256 is invalid.");
    if (!Number.isSafeInteger(archiveBytes) || archiveBytes <= 0 || archiveBytes > MAX_THEME_ARCHIVE_BYTES) errors.push(`The ZIP must be between 1 byte and ${MAX_THEME_ARCHIVE_BYTES / 1024 / 1024} MB.`);
    if (validatorVersion !== PUBLISH_VALIDATOR_VERSION) errors.push(`Update the publisher CLI: validator ${PUBLISH_VALIDATOR_VERSION} is required.`);
    if (getTheme(themeId)) errors.push("That theme id belongs to a first-party theme. Choose a different id.");
    const owner = themeId ? await findThemeOwner(themeId) : null;
    if (owner && owner !== session.publisherId) errors.push("That theme id is already owned by another publisher.");
    const existing = themeId && version ? await findSubmissionByThemeVersion(themeId, version) : null;
    if (existing && existing.publisherId !== session.publisherId) errors.push("That theme id and version have already been submitted by another publisher.");
    if (existing?.status === "published") errors.push("Published versions are immutable. Increase the semantic version and try again.");

    await recordValidationRun({ sessionId: id, phase: "preflight", valid: errors.length === 0, archiveSha256, errors });
    await updatePublishSession(id, {
      attemptCount: session.attemptCount + 1,
      validationJson: JSON.stringify({ errors, warnings: [], coverage: {} }),
      ...(errors.length ? {} : {
        status: "preflight_passed",
        themeId,
        themeVersion: version,
        expectedSha256: archiveSha256,
        archiveBytes,
      }),
    });
    const updated = {
      ...session,
      attemptCount: session.attemptCount + 1,
      validationJson: JSON.stringify({ errors, warnings: [], coverage: {} }),
      ...(errors.length ? {} : { status: "preflight_passed" as const, themeId, themeVersion: version, expectedSha256: archiveSha256, archiveBytes }),
    };
    if (errors.length) {
      return json({
        error: { code: "preflight_failed", message: "The local preflight metadata did not pass server checks." },
        session: publicPublishSession(updated),
        validation: { errors, warnings: [] },
      }, { status: 422 });
    }
    return json({
      session: publicPublishSession(updated),
      uploadUrl: `/api/publish/sessions/${id}/archive`,
      finalizeUrl: `/api/publish/sessions/${id}/finalize`,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
