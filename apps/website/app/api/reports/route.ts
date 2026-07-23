import { env } from "cloudflare:workers";
import { CONTENT_REPORT_KIND_IDS } from "@/db/schema";
import { RequestError, json, readJsonObject, toErrorResponse } from "../_lib/http";
import { createContentReport, type ContentReportKind } from "../_lib/reports";
import { requireTrustedBrowserMutation, safeOrigin } from "../_lib/security";

const REPORT_KINDS = new Set<string>(CONTENT_REPORT_KIND_IDS);
const THEME_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    requireTrustedBrowserMutation(request, safeOrigin(request, env.SITE_URL));
    const payload = await readJsonObject(request, 16_384);
    if (typeof payload.website === "string" && payload.website.trim()) {
      return json({ received: true, reference: "GCT-RECEIVED" }, { status: 201 });
    }
    if (payload.goodFaith !== true) throw new RequestError(400, "confirmation_required", "Confirm that this report is accurate and submitted in good faith.");

    const kind = typeof payload.kind === "string" ? payload.kind : "";
    if (!REPORT_KINDS.has(kind)) throw new RequestError(400, "invalid_report_kind", "Choose copyright, privacy, abuse, or other.");
    const themeId = typeof payload.themeId === "string" ? payload.themeId.trim().toLowerCase() : "";
    if (themeId && !THEME_ID_PATTERN.test(themeId)) throw new RequestError(400, "invalid_theme_id", "Enter a valid theme id.");
    const themeVersion = typeof payload.themeVersion === "string" ? payload.themeVersion.trim() : "";
    if (themeVersion && !VERSION_PATTERN.test(themeVersion)) throw new RequestError(400, "invalid_theme_version", "Enter a semantic theme version such as 1.0.0.");
    const reporterEmail = typeof payload.reporterEmail === "string" ? payload.reporterEmail.trim().toLowerCase() : "";
    if (reporterEmail && (reporterEmail.length > 254 || !EMAIL_PATTERN.test(reporterEmail))) throw new RequestError(400, "invalid_reporter_email", "Enter a valid contact email or leave it blank.");
    const details = typeof payload.details === "string" ? payload.details.trim() : "";
    if (details.length < 40 || details.length > 5_000) throw new RequestError(400, "invalid_report_details", "Describe the issue in 40 to 5,000 characters.");
    let evidenceUrl = typeof payload.evidenceUrl === "string" ? payload.evidenceUrl.trim() : "";
    if (evidenceUrl) {
      let parsed: URL;
      try { parsed = new URL(evidenceUrl); }
      catch { throw new RequestError(400, "invalid_evidence_url", "Enter a valid HTTPS evidence URL or leave it blank."); }
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || evidenceUrl.length > 1_000) {
        throw new RequestError(400, "invalid_evidence_url", "Enter a valid HTTPS evidence URL or leave it blank.");
      }
      evidenceUrl = parsed.toString();
    }

    const report = await createContentReport(request, {
      kind: kind as ContentReportKind,
      themeId: themeId || null,
      themeVersion: themeVersion || null,
      reporterEmail: reporterEmail || null,
      details,
      evidenceUrl: evidenceUrl || null,
    });
    return json({ received: true, reference: report.reference }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
