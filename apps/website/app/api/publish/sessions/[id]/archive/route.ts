import { RequestError, json, readBodyBytes, toErrorResponse } from "../../../../_lib/http";
import { themeAssets } from "../../../../_lib/assets";
import { MAX_THEME_ARCHIVE_BYTES } from "../../../../_lib/submission-validator";
import { authenticatePublishCapability, publicPublishSession, updatePublishSession } from "../../../../_lib/publish-sessions";
import { sha256BytesHex } from "../../../../_lib/security";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await authenticatePublishCapability(request, id);
    if (session.status === "uploaded" && session.archiveKey) {
      return json({ session: publicPublishSession(session) });
    }
    if (session.status !== "preflight_passed" && session.status !== "uploaded") {
      throw new RequestError(409, "invalid_publish_state", `The archive cannot be uploaded while the session is ${session.status}.`);
    }
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/zip" && contentType !== "application/octet-stream") {
      throw new RequestError(415, "invalid_content_type", "Submit the release archive as application/zip.");
    }
    if (request.headers.get("content-encoding")) throw new RequestError(415, "content_encoding_not_allowed", "Compressed HTTP request bodies are not supported.");
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_THEME_ARCHIVE_BYTES) throw new RequestError(413, "payload_too_large", `Upload a theme ZIP up to ${MAX_THEME_ARCHIVE_BYTES / 1024 / 1024} MB.`);
    const bytes = await readBodyBytes(request, MAX_THEME_ARCHIVE_BYTES);
    if (bytes.byteLength <= 0 || bytes.byteLength > MAX_THEME_ARCHIVE_BYTES) throw new RequestError(413, "invalid_archive_size", `Upload a non-empty theme ZIP up to ${MAX_THEME_ARCHIVE_BYTES / 1024 / 1024} MB.`);
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new RequestError(400, "invalid_archive", "The uploaded file is not a ZIP archive.");
    const sha256 = await sha256BytesHex(bytes);
    if (session.archiveBytes !== bytes.byteLength) {
      throw new RequestError(409, "archive_size_mismatch", "The uploaded ZIP size does not match the archive that passed preflight.");
    }
    if (!session.expectedSha256 || sha256 !== session.expectedSha256) {
      throw new RequestError(409, "archive_hash_mismatch", "The uploaded ZIP does not match the archive that passed preflight.");
    }
    const key = `quarantine/${session.publisherId}/${id}/source.zip`;
    await themeAssets().put(key, bytes, {
      httpMetadata: { contentType: "application/zip" },
      customMetadata: {
        source: "agent-publish-quarantine",
        sessionId: id,
        publisherId: session.publisherId,
        sha256,
        expiresAt: session.publishTokenExpiresAt ?? session.buildTokenExpiresAt,
      },
    });
    await updatePublishSession(id, { status: "uploaded", archiveKey: key, archiveBytes: bytes.byteLength });
    return json({ session: publicPublishSession({ ...session, status: "uploaded", archiveKey: key, archiveBytes: bytes.byteLength }) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const POST = PUT;
