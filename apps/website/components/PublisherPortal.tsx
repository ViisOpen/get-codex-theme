"use client";
/* Draft previews are authenticated, private, no-store responses and intentionally bypass the public image optimizer. */
/* eslint-disable @next/next/no-img-element */

import { ArrowRight, CheckCircle, Clock, Copy, Eye, EyeSlash, GithubLogo, Robot, ShieldCheck, SignOut, SpinnerGap, Trash, WarningCircle, XLogo } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthClient } from "@/lib/auth/client";
import { publicPackSafetyStatement, publicPreviewStatement, THEME_DETAIL_COPY } from "@/lib/theme-detail-copy";
import { AuthModalTrigger } from "./AuthModal";
import { usePublisherSession } from "./usePublisherSession";
import { installCommand } from "@/lib/theme-gallery";

type Submission = {
  id: string; themeId: string; version: string; name: string;
  status: "published" | "failed" | "removed";
  createdAt: string; author?: string;
  authorPlatform?: "github" | "x"; authorUrl?: string; category?: string;
  authors?: AuthorProfile[];
};

type PublishStatus = "created" | "build_created" | "draft_ready" | "author_confirmed" | "publish_token_issued" | "preflight_passed" | "uploaded" | "validating" | "published" | "failed" | "expired" | "revoked";
type DraftPreview = {
  digest: string; name: string; description: string; tagline: string; designStory: string;
  tags: string[]; mode: "dark" | "light"; license: string;
  previewMetadata: { kind: "illustrative" | "verified-capture"; label: string; renderer?: string; rendererVersion?: string; platform?: string; codexVersion?: string };
  previewUrls: Record<string, string>;
};
type PublishSession = {
  id: string; status: PublishStatus; expiresAt: string; termsVersion: string;
  category: string; authorPlatform: "github" | "x"; authorUrl: string; authorUsername?: string | null;
  authors: AuthorProfile[];
  themeId?: string | null; version?: string | null; attemptCount: number;
  riskLevel?: "low" | "blocked" | null; decisionReason?: string | null;
  validation?: { errors?: string[]; warnings?: string[]; coverage?: unknown };
  draft?: DraftPreview | null; authorConfirmedAt?: string | null; rightsConfirmedAt?: string | null;
  createdAt: string; updatedAt: string;
};
type ActivePublishSession = PublishSession & { capability?: "build" | "publish"; capabilityCode?: string; prompt?: string };
type AuthorProfile = { platform: "github" | "x"; username: string; displayName: string; url: string };
type SocialProfile = AuthorProfile & { provider: "github" | "x" };

const submissionStatusCopy = { published: "Published", failed: "Not published", removed: "Removed" };
const publishStatusCopy: Record<PublishStatus, string> = {
  created: "Legacy session", build_created: "Waiting for Codex", draft_ready: "Ready to confirm", author_confirmed: "Author confirmed",
  publish_token_issued: "Ready to publish", preflight_passed: "Publish preflight passed", uploaded: "Archive received",
  validating: "Server validating", published: "Published", failed: "Validation failed", expired: "Expired", revoked: "Revoked",
};
const terminalStatuses = new Set<PublishStatus>(["published", "failed", "expired", "revoked"]);
const draftConfirmationStatuses = new Set<PublishStatus>(["draft_ready", "author_confirmed"]);
const editableActivityStatuses = new Set<PublishStatus>(["draft_ready", "author_confirmed", "publish_token_issued", "published", "failed", "expired"]);

export function PublisherPortal() {
  const authSession = usePublisherSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [publishSessions, setPublishSessions] = useState<PublishSession[]>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [selectedAuthorPlatform, setSelectedAuthorPlatform] = useState<"github" | "x" | null>(null);
  const [active, setActive] = useState<ActivePublishSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [removingSessionId, setRemovingSessionId] = useState<string | null>(null);
  const [linking, setLinking] = useState<"github" | "x" | null>(null);
  const [xProfileInput, setXProfileInput] = useState("");
  const [socialError, setSocialError] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [submissionResponse, sessionResponse, socialResponse] = await Promise.all([fetch("/api/submissions", { cache: "no-store" }), fetch("/api/publish/sessions", { cache: "no-store" }), fetch("/api/publisher/social-profiles", { cache: "no-store" })]);
      const submissionPayload = await submissionResponse.json() as { submissions?: Submission[]; error?: { message?: string } };
      const sessionPayload = await sessionResponse.json() as { sessions?: PublishSession[]; error?: { message?: string } };
      const socialPayload = await socialResponse.json() as { profiles?: SocialProfile[]; error?: { message?: string } };
      if (!submissionResponse.ok) throw new Error(submissionPayload.error?.message ?? "Could not load submissions.");
      if (!sessionResponse.ok) throw new Error(sessionPayload.error?.message ?? "Could not load publishing drafts.");
      if (!socialResponse.ok) throw new Error(socialPayload.error?.message ?? "Could not load connected social profiles.");
      setSubmissions(submissionPayload.submissions ?? []);
      setPublishSessions(sessionPayload.sessions ?? []);
      const profiles = socialPayload.profiles ?? [];
      setSocialProfiles(profiles);
      setSelectedAuthorPlatform((selected) => {
        const available = profiles.map((profile) => profile.platform);
        return selected && available.includes(selected) ? selected : (available[0] ?? null);
      });
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not load publisher data."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authSession.user?.id) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authSession.user?.id, load]);

  useEffect(() => {
    if (!authSession.user?.id) return;
    const url = new URL(window.location.href);
    const social = url.searchParams.get("social");
    const timer = window.setTimeout(() => {
      if (social === "connected") setMessage("GitHub connected and verified.");
      if (social === "error") setSocialError("We couldn’t connect GitHub. Please try again.");
    }, 0);
    if (social) {
      url.searchParams.delete("social");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    return () => window.clearTimeout(timer);
  }, [authSession.user?.id]);
  const activeId = active?.id;
  const activeStatus = active?.status;

  useEffect(() => {
    if (!activeId || !activeStatus || terminalStatuses.has(activeStatus)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [activeId, activeStatus]);

  useEffect(() => {
    if (!activeId || !activeStatus || terminalStatuses.has(activeStatus)) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/publish/sessions/${activeId}`, { cache: "no-store" });
        const payload = await response.json() as { session?: PublishSession };
        if (!cancelled && response.ok && payload.session) {
          const updated = payload.session;
          setActive((current) => current?.id === updated.id ? { ...current, ...updated } : current);
          setPublishSessions((items) => mergeSession(items, updated));
          if (terminalStatuses.has(updated.status)) void load();
        }
      } catch { /* A later poll can recover from a local transient failure. */ }
    };
    const timer = window.setInterval(() => void poll(), 3_000);
    void poll();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeId, activeStatus, load]);

  const secondsRemaining = useMemo(() => active ? Math.max(0, Math.ceil((new Date(active.expiresAt).getTime() - now) / 1_000)) : 0, [active, now]);
  const displayedPrompt = useMemo(() => {
    if (!active?.prompt || !active.capabilityCode || showCode) return active?.prompt ?? "";
    return active.prompt.replace(active.capabilityCode, "[hidden until revealed or copied]");
  }, [active, showCode]);
  const githubProfile = socialProfiles.find((item) => item.platform === "github");
  const xProfile = socialProfiles.find((item) => item.platform === "x");

  async function createBuildSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true); setErrors([]); setMessage("");
    try {
      const response = await fetch("/api/publish/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID().replaceAll("-", "") },
        body: JSON.stringify({ authorPlatform: selectedAuthorPlatform }),
      });
      const payload = await response.json() as { session?: PublishSession; capability?: "build"; capabilityCode?: string; prompt?: string; error?: { message?: string } };
      if (!response.ok || !payload.session || !payload.capabilityCode || !payload.prompt) throw new Error(payload.error?.message ?? "Could not create a secure build session.");
      const created = { ...payload.session, capability: "build" as const, capabilityCode: payload.capabilityCode, prompt: payload.prompt };
      setActive(created); setPublishSessions((items) => mergeSession(items, payload.session as PublishSession)); setShowCode(false); setNow(Date.now());
      setMessage("Publishing Session Prompt created. Paste it into Codex once; the same command will wait for your website confirmation and then publish.");
    } catch (cause) { setErrors([cause instanceof Error ? cause.message : "Could not create a secure build session."]); }
    finally { setCreating(false); }
  }

  async function confirmDraft() {
    if (!active?.draft) return;
    setConfirming(true); setErrors([]); setMessage("");
    try {
      const response = await fetch(`/api/publish/sessions/${active.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftDigest: active.draft.digest, termsVersion: active.termsVersion,
          publicCopyConfirmed: true,
          rightsConfirmed: true,
          termsAccepted: true,
        }),
      });
      const payload = await response.json() as { session?: PublishSession; continuation?: "agent" | "manual"; capability?: "publish"; capabilityCode?: string; prompt?: string; error?: { message?: string } };
      if (!response.ok || !payload.session) throw new Error(payload.error?.message ?? "Could not authorize this release.");
      const next = payload.continuation === "manual" && payload.capabilityCode && payload.prompt
        ? { ...payload.session, capability: "publish" as const, capabilityCode: payload.capabilityCode, prompt: payload.prompt }
        : payload.session;
      setActive(next);
      setPublishSessions((items) => mergeSession(items, payload.session as PublishSession)); setShowCode(false); setNow(Date.now());
      setMessage(payload.continuation === "agent"
        ? "Release confirmed. The waiting Codex command is continuing automatically."
        : "This older draft needs the fallback Publish prompt shown below.");
    } catch (cause) { setErrors([cause instanceof Error ? cause.message : "Could not authorize this release."]); }
    finally { setConfirming(false); }
  }

  function openActivity(item: PublishSession) {
    setActive((current) => current?.id === item.id ? current : item);
    setShowCode(false);
    setNow(Date.now());
    setErrors([]);
    setMessage("");
  }

  async function resumeActivity(mode: "resume" | "edit" = "resume") {
    if (!active) return;
    if (mode === "edit") {
      const confirmed = window.confirm(active.status === "published"
        ? "Edit this published theme with Codex? A new publishing activity will be created. The published version will remain unchanged, and the edited theme must use a new version number."
        : "Edit this draft with Codex? Its current private previews and capability codes will be replaced with a new Session Prompt.");
      if (!confirmed) return;
    }
    setResuming(true); setErrors([]); setMessage("");
    try {
      const suffix = mode === "edit" ? "?mode=edit" : "";
      const response = await fetch(`/api/publish/sessions/${active.id}/resume${suffix}`, { method: "POST" });
      const payload = await response.json() as { session?: PublishSession; capabilityCode?: string; prompt?: string; error?: { message?: string } };
      if (!response.ok || !payload.session) throw new Error(payload.error?.message ?? "Could not resume this publishing activity.");
      const resumed = payload.capabilityCode && payload.prompt
        ? { ...payload.session, capability: "build" as const, capabilityCode: payload.capabilityCode, prompt: payload.prompt }
        : payload.session;
      setActive(resumed);
      setPublishSessions((items) => mergeSession(items, payload.session as PublishSession));
      setShowCode(false); setNow(Date.now());
      setMessage(mode === "edit"
        ? "A new Session Prompt is ready. Paste it into Codex to edit the local theme pack, regenerate previews, and validate the next draft."
        : payload.prompt ? "A replacement Session Prompt was created. The previous private code is no longer valid." : "Draft restored. Review it before creating a new publishing session.");
    } catch (cause) { setErrors([cause instanceof Error ? cause.message : "Could not resume this publishing activity."]); }
    finally { setResuming(false); }
  }

  async function removeActivity(id: string) {
    const item = publishSessions.find((session) => session.id === id) ?? (active?.id === id ? active : null);
    const confirmed = window.confirm(item?.status === "published"
      ? "Remove this item from Recent Activity? The published theme will remain available in the Registry."
      : "Remove this publishing activity? Its private draft assets and any active capability codes will be revoked. This cannot be undone.");
    if (!confirmed) return;
    setRemovingSessionId(id); setErrors([]); setMessage("");
    try {
      const response = await fetch(`/api/publish/sessions/${id}`, { method: "DELETE" });
      const payload = await response.json() as { session?: PublishSession; error?: { message?: string } };
      if (!response.ok || !payload.session) throw new Error(payload.error?.message ?? "Could not remove this publishing activity.");
      setPublishSessions((items) => items.filter((item) => item.id !== id));
      setActive((current) => current?.id === id ? null : current);
      setMessage("Publishing activity removed. A published theme, if any, remains available in the Registry.");
    } catch (cause) { setErrors([cause instanceof Error ? cause.message : "Could not remove this publishing activity."]); }
    finally { setRemovingSessionId(null); }
  }

  async function copy(value: string, success: string) {
    try { await navigator.clipboard.writeText(value); setMessage(success); }
    catch { setErrors(["Clipboard access was blocked. Select and copy the text manually."]); }
  }

  async function linkGithub() {
    setLinking("github"); setSocialError(""); setErrors([]); setMessage("");
    try {
      const authClient = await getAuthClient();
      const callbackURL = new URL("/publish?social=connected", window.location.origin).toString();
      const errorCallbackURL = new URL("/publish?social=error", window.location.origin).toString();
      const result = await authClient.linkSocial({
        provider: "github",
        callbackURL,
        errorCallbackURL,
      });
      if (result.error) throw new Error(result.error.message || "The social account could not be connected.");
      if (result.data?.url) window.location.assign(result.data.url);
    } catch (cause) {
      setLinking(null);
      setSocialError(formatSocialConnectionError(cause));
    }
  }

  async function saveXProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLinking("x"); setSocialError(""); setErrors([]); setMessage("");
    try {
      const response = await fetch("/api/publisher/social/x/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: xProfileInput }),
      });
      const payload = await response.json() as { profile?: SocialProfile; error?: { message?: string } };
      if (!response.ok || !payload.profile) throw new Error(payload.error?.message ?? "The X profile could not be saved.");
      setSocialProfiles((profiles) => [...profiles.filter((profile) => profile.platform !== "x"), payload.profile as SocialProfile]
        .sort((left, right) => left.platform.localeCompare(right.platform)));
      setSelectedAuthorPlatform("x");
      setXProfileInput("");
      setMessage("X profile saved as public contributor attribution.");
    } catch (cause) {
      setSocialError(cause instanceof Error ? cause.message : "The X profile could not be saved.");
    } finally {
      setLinking(null);
    }
  }

  async function signOut() {
    setActive(null); setPublishSessions([]); setSubmissions([]); setSocialProfiles([]); setSelectedAuthorPlatform(null); setXProfileInput("");
    const authClient = await getAuthClient(); await authClient.signOut(); await authSession.refetch();
  }

  if (authSession.isPending) return <div className="portal-loading"><SpinnerGap className="spin" size={24} /> Checking your session…</div>;
  if (!authSession.user) return <div className="publisher-signin"><div className="publisher-signin-copy"><span className="eyebrow">PUBLISHER ACCESS</span><h2>Ready to share<br /><em>your theme?</em></h2><p>Sign in with Google or GitHub, connect the public contributor profile, and let Codex prepare a private draft before anything is published.</p><AuthModalTrigger returnTo="/publish">Sign in to publish <span aria-hidden="true">↗</span></AuthModalTrigger></div></div>;

  return <div className="publisher-grid">
    <section className="publisher-card publisher-upload-card">
      <div className="portal-account"><div><span className="eyebrow">PUBLISHER ACCOUNT</span><strong>{authSession.user.name || authSession.user.email}</strong><small>{authSession.user.email}</small></div><button className="icon-text-button" type="button" onClick={() => void signOut()}><SignOut size={17} /> Sign out</button></div>
      <div className="publisher-step"><span>01</span><div><h2>Choose one publishing identity.</h2><p>Create one Session Prompt and paste it into Codex once. Codex prepares the private draft, waits while you confirm this page, and then continues automatically.</p></div></div>
      <div className="publish-security-notes"><article><ShieldCheck size={20} weight="fill" /><div><strong>Separate capabilities, one session</strong><p>Build and Publish permissions remain isolated internally. The final permission is encrypted to the waiting CLI and never needs a second copy-and-paste.</p></div></article><article><Robot size={20} weight="fill" /><div><strong>AI-completed listing</strong><p>Codex fills missing factual listing copy. You confirm the exact result on this page.</p></div></article></div>
      <section className="social-profile-manager" aria-labelledby="social-profile-title">
        <div><span className="eyebrow">CREATOR PROFILE</span><strong id="social-profile-title">Choose the public profile you want to publish as.</strong><p>GitHub can be connected through your sign-in provider. For X, provide the public profile page you want displayed with the theme; Get Codex Theme does not call the X API.</p></div>
        <div className="social-profile-actions">
          {githubProfile
            ? <a className="social-profile-connected" href={githubProfile.url} rel="noreferrer" target="_blank"><GithubLogo size={18} weight="fill" /><span><small>Connected GitHub</small><strong>{githubProfile.displayName}</strong></span><CheckCircle size={17} weight="fill" /></a>
            : <button className="social-profile-connect" disabled={linking !== null} onClick={() => void linkGithub()} type="button"><GithubLogo size={18} weight="fill" />{linking === "github" ? "Connecting…" : "Connect GitHub"}</button>}
          <div className="social-profile-x-card">
            {xProfile
              ? <a className="social-profile-connected" href={xProfile.url} rel="noreferrer" target="_blank"><XLogo size={18} weight="fill" /><span><small>Public X profile</small><strong>{xProfile.displayName}</strong></span><CheckCircle size={17} weight="fill" /></a>
              : <div className="social-profile-x-label"><XLogo size={18} weight="fill" /><span><small>Public X profile</small><strong>Add your profile page</strong></span></div>}
            <form className="social-profile-x-form" onSubmit={saveXProfile}>
              <input aria-label="X profile URL" autoComplete="url" onChange={(event) => setXProfileInput(event.target.value)} placeholder={xProfile?.url ?? "https://x.com/your-handle"} required type="url" value={xProfileInput} />
              <button disabled={linking !== null} type="submit">{linking === "x" ? "Saving…" : xProfile ? "Update" : "Add X profile"}</button>
            </form>
          </div>
        </div>
        {socialError ? <p className="social-profile-error" role="alert"><WarningCircle size={17} weight="fill" /><span><strong>Connection error</strong>{socialError}</span></p> : null}
      </section>
      <form className="publish-form agent-publish-form" onSubmit={createBuildSession}>
        <fieldset className="publish-as-field"><legend>Publish as</legend><div className="publish-as-options">{(["github", "x"] as const).map((platform) => { const profile = socialProfiles.find((item) => item.platform === platform); const selected = selectedAuthorPlatform === platform; const Icon = platform === "github" ? GithubLogo : XLogo; return <button aria-pressed={selected} className={selected ? "publish-as-option publish-as-option--selected" : "publish-as-option"} disabled={!profile || creating} key={platform} onClick={() => setSelectedAuthorPlatform(platform)} type="button"><Icon size={18} weight="fill" /><span><small>{platform === "github" ? "GitHub" : "X"}</small><strong>{profile?.displayName ?? "Not connected"}</strong></span><CheckCircle aria-hidden="true" size={17} weight="fill" /></button>; })}</div></fieldset>
        {!loading && !socialProfiles.length ? <p className="social-profile-required">Connect GitHub or add your public X profile before publishing.</p> : null}
        {!loading && socialProfiles.length > 0 && !selectedAuthorPlatform ? <p className="social-profile-required">Choose one public contributor identity.</p> : null}
        <button className="button button--dark button--wide" disabled={creating || loading || !selectedAuthorPlatform} type="submit">{creating ? <><SpinnerGap className="spin" size={18} /> Creating session…</> : <>Create Publishing Session Prompt <span aria-hidden="true">↗</span></>}</button>
      </form>

      {active ? <div className="publish-session-panel" aria-live="polite">
        <div className="publish-session-heading"><div><span className={`status-pill status-pill--publish-${active.status}`}>{publishStatusCopy[active.status]}</span><strong>{active.themeId ? `${active.themeId}@${active.version}` : "One publishing session"}</strong></div><span className={secondsRemaining < 120 ? "session-expiry session-expiry--urgent" : "session-expiry"}>{terminalStatuses.has(active.status) ? "Session closed" : `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")} remaining`}</span></div>
        {active.status === "build_created" && active.prompt && active.capabilityCode ? <CapabilityPanel active={active} displayedPrompt={displayedPrompt} showCode={showCode} setShowCode={setShowCode} copy={copy} label="Session" /> : null}
        {active.draft && draftConfirmationStatuses.has(active.status) ? <DraftConfirmation session={active} confirming={confirming} onConfirm={confirmDraft} /> : null}
        {active.status === "publish_token_issued" && active.prompt && active.capabilityCode ? <CapabilityPanel active={active} displayedPrompt={displayedPrompt} showCode={showCode} setShowCode={setShowCode} copy={copy} label="Publish" /> : null}
        {active.status === "publish_token_issued" && !active.prompt ? <p className="publish-decision"><strong>Codex is continuing</strong>The exact release is authorized. The waiting CLI received its encrypted final capability and will update this activity automatically.</p> : null}
        <div className="publish-session-actions">
          {(active.status === "build_created" && !active.prompt) || active.status === "expired" ? <button className="button button--dark" disabled={resuming} onClick={() => void resumeActivity()} type="button">{resuming ? <><SpinnerGap className="spin" size={16} /> Resuming…</> : <><ArrowRight size={16} /> {active.draft ? "Resume draft" : "Create replacement Session Prompt"}</>}</button> : null}
          {active.draft && editableActivityStatuses.has(active.status) ? <button className="button" disabled={resuming} onClick={() => void resumeActivity("edit")} type="button">{resuming ? <><SpinnerGap className="spin" size={16} /> Preparing…</> : <><Robot size={16} /> Edit with Codex</>}</button> : null}
          <button className="icon-text-button" disabled={removingSessionId === active.id} onClick={() => void removeActivity(active.id)} type="button"><Trash size={16} /> {removingSessionId === active.id ? "Removing…" : "Remove activity"}</button>
        </div>
        {active.status === "build_created" && !active.prompt ? <p className="publish-decision"><strong>Private code not stored</strong>This activity can continue, but its one-time Session Prompt cannot be shown again. Create a replacement prompt to invalidate the old code.</p> : null}
        {active.decisionReason ? <p className="publish-decision"><strong>Decision</strong>{active.decisionReason}</p> : null}
        {active.validation?.errors?.length ? <div className="validation-report validation-report--error" role="alert"><strong><WarningCircle size={18} weight="fill" /> Server validation</strong><ul>{active.validation.errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      </div> : null}
      {message ? <p className="form-success" role="status"><CheckCircle size={18} weight="fill" />{message}</p> : null}
      {errors.length ? <div className="validation-report validation-report--error" role="alert"><strong><WarningCircle size={18} weight="fill" /> Publishing error</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
    </section>

    <section className="publisher-card publisher-history">
      <div className="portal-section-heading"><span className="eyebrow">RECENT ACTIVITY</span><button className="text-button" disabled={loading} onClick={() => { setLoading(true); void load(); }} type="button">Refresh</button></div>
      {loading && !publishSessions.length ? <p className="muted-row"><SpinnerGap className="spin" size={17} /> Loading…</p> : null}
      {!loading && !publishSessions.length ? <div className="empty-submissions"><Clock size={25} /><h3>No publishing sessions yet</h3><p>Choose one public contributor profile and create the single Prompt that Codex will use from draft through release.</p></div> : null}
      <div className="submission-list publish-session-list">{publishSessions.map((item) => <article className="submission-row publish-activity-row" key={item.id}><div className="publish-activity-status"><span className={`status-pill status-pill--publish-${item.status}`}>{publishStatusCopy[item.status]}</span><button aria-label={`Remove ${item.themeId ? `${item.themeId} ${item.version}` : "publishing activity"}`} className="activity-remove-button" disabled={removingSessionId === item.id} onClick={() => void removeActivity(item.id)} title="Remove from recent activity" type="button">{removingSessionId === item.id ? <SpinnerGap className="spin" size={15} /> : <Trash size={15} />}</button></div><button className="publish-activity-open" onClick={() => openActivity(item)} type="button"><span><strong>{item.themeId ? `${item.themeId}@${item.version}` : "Awaiting Build validation"}</strong><small>{item.decisionReason ?? `Created ${formatDate(item.createdAt)} · build attempt ${item.attemptCount}/3`}</small></span><span>{item.draft && !terminalStatuses.has(item.status) ? "Continue" : "Open"} <ArrowRight size={14} /></span></button></article>)}</div>
      {submissions.length ? <div className="published-history"><span className="eyebrow">THEME RELEASES</span><div className="submission-list">{submissions.map((item) => { const authors = item.authors?.length ? item.authors : item.authorUrl && item.authorPlatform ? [{ platform: item.authorPlatform, provider: item.authorPlatform, username: item.author ?? "Author", displayName: item.author ?? "Author", url: item.authorUrl }] : []; return <article className="submission-row" key={item.id}><span className={`status-pill status-pill--${item.status}`}>{submissionStatusCopy[item.status]}</span><h3>{item.name}</h3><p><code>{item.themeId}@{item.version}</code> · {formatDate(item.createdAt)}</p>{item.status === "published" ? <><p className="submission-author">Published in {item.category ?? "aesthetic"}{authors.map((author) => <span key={author.platform}> · <a href={author.url} rel="noreferrer" target="_blank">{author.displayName} on {author.platform === "x" ? "X" : "GitHub"} ↗</a></span>)}</p><code className="install-command">{installCommand(item.themeId, item.version)}</code></> : null}</article>; })}</div></div> : null}
    </section>

  </div>;
}

function formatSocialConnectionError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "The social account could not be connected.";
  if (/invalid origin/i.test(message)) {
    return `Account connection is not enabled for ${window.location.origin}. Allow this local address in Neon Auth, then try again.`;
  }
  return message;
}

function CapabilityPanel({ active, displayedPrompt, showCode, setShowCode, copy, label }: { active: ActivePublishSession; displayedPrompt: string; showCode: boolean; setShowCode: (value: boolean | ((current: boolean) => boolean)) => void; copy: (value: string, success: string) => Promise<void>; label: "Session" | "Publish" }) {
  return <div className="capability-panel"><label className="submission-code"><span>{label} code · shown only in this page load</span><div><input aria-label={`${label} code`} readOnly type={showCode ? "text" : "password"} value={active.capabilityCode} /><button aria-label={showCode ? `Hide ${label} code` : `Show ${label} code`} onClick={() => setShowCode((value) => !value)} type="button">{showCode ? <EyeSlash size={18} /> : <Eye size={18} />}</button></div></label><label className="publish-prompt"><span>{label} Prompt for Codex</span><textarea readOnly rows={14} value={displayedPrompt} /></label><div className="publish-session-actions"><button className="button button--dark" onClick={() => void copy(active.prompt as string, `${label} prompt copied. It contains a short-lived, scoped capability code.`)} type="button"><Copy size={16} /> Copy {label} Prompt</button></div></div>;
}

function DraftConfirmation({ session, confirming, onConfirm }: { session: ActivePublishSession; confirming: boolean; onConfirm: () => Promise<void> }) {
  const draft = session.draft as DraftPreview;
  const previewStatement = publicPreviewStatement(draft.previewMetadata);
  return <div className="draft-confirmation">
    <div className="publisher-step publisher-step--confirmation"><span>02</span><div><h2>Confirm the exact public page.</h2><p>One confirmation authorizes only this draft digest. The Codex command already waiting on your computer will continue automatically.</p></div></div>
    <article className={`public-theme-preview public-theme-preview--${draft.mode}`}><span className="eyebrow">{draft.mode} Codex theme · Free</span><h3>{draft.name}<br /><em>Codex theme.</em></h3><p>{draft.description}</p><p className="contributor-thanks">Thanks {session.authors.map((author, index) => <span key={author.platform}>{index ? " and " : ""}<a href={author.url} rel="noreferrer" target="_blank">{author.displayName}</a></span>)} for contributing this theme.</p><div className="public-theme-tags">{draft.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="public-theme-copy"><span>{THEME_DETAIL_COPY.designStoryLabel}</span><h4>{draft.tagline}</h4><p>{draft.designStory}</p><p>{publicPackSafetyStatement("community")}</p></div></article>
    <section className="draft-layout-previews"><span className="eyebrow">{THEME_DETAIL_COPY.layoutPreviewsLabel}</span><h3>{THEME_DETAIL_COPY.layoutPreviewsTitle}</h3><p>{previewStatement}</p><div>{[["screenshotHome", "Home preview"], ["screenshotTask", "Active task preview"]].map(([key, label]) => <figure key={key}><img alt={`${draft.name} ${label}`} src={draft.previewUrls[key]} /><figcaption>{label} · {draft.previewMetadata.label}</figcaption></figure>)}</div></section>
    <section className="draft-site-copy"><article><strong>{THEME_DETAIL_COPY.includedLabel}</strong><p>{THEME_DETAIL_COPY.includedItems.join(" · ")}</p></article><article><strong>{THEME_DETAIL_COPY.compatibilityLabel}</strong><p>{THEME_DETAIL_COPY.compatibility}</p></article><article><strong>Release profile</strong><p>{session.category} · {draft.license}{session.authors.map((author) => <span key={author.platform}> · <a href={author.url} rel="noreferrer" target="_blank">{author.displayName} on {author.platform === "x" ? "X" : "GitHub"}</a></span>)}</p></article></section>
    <code className="draft-digest">Confirmed draft SHA-256: {draft.digest}</code>
    <div className="publish-confirmation">
      <p>By selecting <strong>Confirm &amp; Publish</strong>, you confirm that the copy and previews above accurately represent the theme, that you may redistribute every included asset, and that you accept <a href="/terms" rel="noreferrer" target="_blank">publishing terms {session.termsVersion}</a>.</p>
      <button className="button button--dark button--wide" disabled={confirming} onClick={() => void onConfirm()} type="button">{confirming ? <><SpinnerGap className="spin" size={18} /> Authorizing Codex…</> : <>Confirm &amp; Publish ↗</>}</button>
    </div>
  </div>;
}

function mergeSession(items: PublishSession[], session: PublishSession) { return [session, ...items.filter((item) => item.id !== session.id)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20); }
function formatDate(value: string) { const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`; return new Date(normalized).toLocaleDateString(); }
