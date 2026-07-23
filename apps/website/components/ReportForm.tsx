"use client";

import { CheckCircle, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";

export function ReportForm({ initialThemeId = "", initialVersion = "" }: { initialThemeId?: string; initialVersion?: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: data.get("kind"),
          themeId: data.get("themeId"),
          themeVersion: data.get("themeVersion"),
          reporterEmail: data.get("reporterEmail"),
          evidenceUrl: data.get("evidenceUrl"),
          details: data.get("details"),
          website: data.get("website"),
          goodFaith: data.get("goodFaith") === "on",
        }),
      });
      const payload = await response.json() as { reference?: string; error?: { message?: string } };
      if (!response.ok || !payload.reference) throw new Error(payload.error?.message ?? "The report could not be submitted.");
      setReference(payload.reference);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="report-success" role="status">
        <CheckCircle size={32} weight="fill" />
        <div><h2>Report received.</h2><p>Save this private reference: <code>{reference}</code>. A maintainer can use it to locate the report without exposing its contents publicly.</p></div>
      </div>
    );
  }

  return (
    <form className="report-form" onSubmit={submit}>
      <div className="report-form-grid">
        <label><span>Report type</span><select defaultValue="copyright" name="kind" required><option value="copyright">Copyright or trademark</option><option value="privacy">Privacy or personal data</option><option value="abuse">Abuse, unsafe, or deceptive content</option><option value="other">Other removal request</option></select></label>
        <label><span>Contact email <small>Optional</small></span><input autoComplete="email" inputMode="email" name="reporterEmail" placeholder="you@example.com" type="email" /></label>
        <label><span>Theme id <small>Optional</small></span><input defaultValue={initialThemeId} name="themeId" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="theme-name" /></label>
        <label><span>Theme version <small>Optional</small></span><input defaultValue={initialVersion} name="themeVersion" pattern="[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?" placeholder="1.0.0" /></label>
      </div>
      <label><span>Evidence link <small>Optional · HTTPS only</small></span><input inputMode="url" name="evidenceUrl" placeholder="https://…" type="url" /></label>
      <label><span>What should be removed or corrected?</span><textarea maxLength={5000} minLength={40} name="details" placeholder="Explain what content is affected, why you are authorized to report it, and the outcome you are requesting." required rows={8} /></label>
      <label className="report-honeypot" aria-hidden="true"><span>Website</span><input autoComplete="off" name="website" tabIndex={-1} /></label>
      <label className="rights-confirmation"><input name="goodFaith" required type="checkbox" /><span>I confirm that this report is accurate and submitted in good faith.</span></label>
      <p className="report-privacy-note">The report is stored privately. We do not publish your email or report text, and we do not store your raw IP address.</p>
      {error ? <p className="form-error" role="alert"><WarningCircle size={18} weight="fill" /> {error}</p> : null}
      <button className="button button--light button--wide" disabled={submitting} type="submit">{submitting ? <><SpinnerGap className="spin" size={18} /> Submitting…</> : "Submit private report"}</button>
    </form>
  );
}
