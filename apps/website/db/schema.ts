import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const THEME_CATEGORY_IDS = ["characters", "brands", "gaming", "culture", "aesthetic"] as const;
export const CONTENT_REPORT_KIND_IDS = ["copyright", "privacy", "abuse", "other"] as const;
export const PUBLISH_SESSION_STATUS_IDS = ["created", "build_created", "draft_ready", "author_confirmed", "publish_token_issued", "preflight_passed", "uploaded", "validating", "published", "failed", "expired", "revoked"] as const;
export const PUBLISH_RISK_LEVEL_IDS = ["low", "blocked"] as const;

export const themeSubmissions = sqliteTable(
  "theme_submissions",
  {
    id: text("id").primaryKey(),
    publisherId: text("publisher_id").notNull(),
    publisherEmail: text("publisher_email").notNull(),
    themeId: text("theme_id").notNull(),
    version: text("version").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    tagline: text("tagline"),
    designStory: text("design_story"),
    author: text("author").notNull(),
    authorPlatform: text("author_platform", { enum: ["github", "x"] }).notNull().default("github"),
    authorUrl: text("author_url").notNull().default("https://github.com/ViisOpen"),
    authorProfilesJson: text("author_profiles_json").notNull().default("[]"),
    category: text("category", { enum: THEME_CATEGORY_IDS }).notNull().default("aesthetic"),
    mode: text("mode", { enum: ["dark", "light"] }).notNull(),
    license: text("license").notNull(),
    status: text("status", { enum: ["published", "failed", "removed"] })
      .notNull()
      .default("published"),
    archiveKey: text("archive_key").notNull(),
    archiveSha256: text("archive_sha256").notNull(),
    archiveBytes: integer("archive_bytes").notNull(),
    manifestJson: text("manifest_json").notNull(),
    validationJson: text("validation_json").notNull(),
    galleryAssetsJson: text("gallery_assets_json").notNull().default("{}"),
    decisionNotes: text("review_notes"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    processedAt: text("reviewed_at"),
    publishedAt: text("published_at"),
  },
  (table) => [
    uniqueIndex("theme_submissions_theme_version_unique").on(table.themeId, table.version),
    index("theme_submissions_publisher_created_idx").on(table.publisherId, table.createdAt),
    index("theme_submissions_status_created_idx").on(table.status, table.createdAt),
    index("theme_submissions_theme_status_idx").on(table.themeId, table.status),
  ],
);

export const themeNamespaces = sqliteTable(
  "theme_namespaces",
  {
    themeId: text("theme_id").primaryKey(),
    publisherId: text("publisher_id").notNull(),
    claimedAt: text("claimed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("theme_namespaces_publisher_idx").on(table.publisherId)],
);

export const publishSessions = sqliteTable(
  "publish_sessions",
  {
    id: text("id").primaryKey(),
    publisherId: text("publisher_id").notNull(),
    publisherEmail: text("publisher_email").notNull(),
    buildTokenHash: text("token_hash").notNull(),
    buildTokenExpiresAt: text("token_expires_at").notNull(),
    buildTokenConsumedAt: text("token_consumed_at"),
    publishTokenHash: text("publish_token_hash"),
    publishTokenExpiresAt: text("publish_token_expires_at"),
    publishTokenConsumedAt: text("publish_token_consumed_at"),
    agentPublicKeyJson: text("agent_public_key_json"),
    publishTokenEnvelope: text("publish_token_envelope"),
    status: text("status", { enum: PUBLISH_SESSION_STATUS_IDS }).notNull().default("build_created"),
    validatorVersion: text("validator_version").notNull(),
    termsVersion: text("terms_version").notNull(),
    rightsConfirmedAt: text("rights_confirmed_at"),
    authorConfirmedAt: text("author_confirmed_at"),
    category: text("category", { enum: THEME_CATEGORY_IDS }).notNull(),
    authorPlatform: text("author_platform", { enum: ["github", "x"] }).notNull(),
    authorUrl: text("author_url").notNull(),
    authorProfilesJson: text("author_profiles_json").notNull().default("[]"),
    themeId: text("theme_id"),
    themeVersion: text("theme_version"),
    draftManifestJson: text("draft_manifest_json"),
    draftPreviewJson: text("draft_preview_json").notNull().default("{}"),
    draftDigest: text("draft_digest"),
    confirmedDraftDigest: text("confirmed_draft_digest"),
    expectedSha256: text("expected_sha256"),
    archiveKey: text("archive_key"),
    archiveBytes: integer("archive_bytes"),
    attemptCount: integer("attempt_count").notNull().default(0),
    riskLevel: text("risk_level", { enum: PUBLISH_RISK_LEVEL_IDS }),
    decisionReason: text("decision_reason"),
    validationJson: text("validation_json").notNull().default("{}"),
    idempotencyKey: text("idempotency_key"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
    archivedAt: text("archived_at"),
  },
  (table) => [
    uniqueIndex("publish_sessions_publisher_idempotency_unique").on(table.publisherId, table.idempotencyKey),
    index("publish_sessions_publisher_created_idx").on(table.publisherId, table.createdAt),
    index("publish_sessions_status_updated_idx").on(table.status, table.updatedAt),
    index("publish_sessions_expiry_idx").on(table.buildTokenExpiresAt),
    index("publish_sessions_publish_expiry_idx").on(table.publishTokenExpiresAt),
    index("publish_sessions_theme_idx").on(table.themeId, table.themeVersion),
  ],
);

export const publishValidationRuns = sqliteTable(
  "publish_validation_runs",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => publishSessions.id, { onDelete: "cascade" }),
    phase: text("phase", { enum: ["build", "preflight", "server"] }).notNull(),
    validatorVersion: text("validator_version").notNull(),
    valid: integer("valid").notNull(),
    archiveSha256: text("archive_sha256"),
    errorsJson: text("errors_json").notNull().default("[]"),
    warningsJson: text("warnings_json").notNull().default("[]"),
    coverageJson: text("coverage_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("publish_validation_runs_session_created_idx").on(table.sessionId, table.createdAt),
  ],
);

export const themeLikes = sqliteTable(
  "theme_likes",
  {
    id: text("id").primaryKey(),
    themeId: text("theme_id").notNull(),
    actorKind: text("actor_kind", { enum: ["anonymous", "user"] }).notNull(),
    actorKeyHash: text("actor_key_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("theme_likes_theme_actor_unique").on(table.themeId, table.actorKind, table.actorKeyHash),
    index("theme_likes_theme_created_idx").on(table.themeId, table.createdAt),
  ],
);

export const themeLikeRateLimits = sqliteTable(
  "theme_like_rate_limits",
  {
    actorKind: text("actor_kind", { enum: ["anonymous", "user"] }).notNull(),
    actorKeyHash: text("actor_key_hash").notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    windowStartedAt: integer("window_started_at").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.actorKind, table.actorKeyHash, table.windowSeconds] }),
    index("theme_like_rate_limits_updated_idx").on(table.updatedAt),
  ],
);

export const contentReports = sqliteTable(
  "content_reports",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: CONTENT_REPORT_KIND_IDS }).notNull(),
    themeId: text("theme_id"),
    themeVersion: text("theme_version"),
    reporterEmail: text("reporter_email"),
    details: text("details").notNull(),
    evidenceUrl: text("evidence_url"),
    sourceKeyHash: text("source_key_hash").notNull(),
    status: text("status", { enum: ["received", "resolved"] }).notNull().default("received"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    index("content_reports_status_created_idx").on(table.status, table.createdAt),
    index("content_reports_theme_created_idx").on(table.themeId, table.createdAt),
    index("content_reports_source_created_idx").on(table.sourceKeyHash, table.createdAt),
  ],
);

export const contentReportRateLimits = sqliteTable(
  "content_report_rate_limits",
  {
    sourceKeyHash: text("source_key_hash").notNull(),
    windowSeconds: integer("window_seconds").notNull(),
    windowStartedAt: integer("window_started_at").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKeyHash, table.windowSeconds] }),
    index("content_report_rate_limits_updated_idx").on(table.updatedAt),
  ],
);

export const publisherSocialProfiles = sqliteTable(
  "publisher_social_profiles",
  {
    id: text("id").primaryKey(),
    publisherId: text("publisher_id").notNull(),
    platform: text("platform", { enum: ["x"] }).notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    profileUrl: text("profile_url").notNull(),
    // Legacy nullable column retained after the direct-profile flow replaced X OAuth.
    verifiedAt: text("verified_at"),
    connectedAt: text("connected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("publisher_social_profiles_publisher_platform_unique").on(table.publisherId, table.platform),
    index("publisher_social_profiles_publisher_idx").on(table.publisherId),
  ],
);

export type ThemeSubmission = typeof themeSubmissions.$inferSelect;
export type NewThemeSubmission = typeof themeSubmissions.$inferInsert;
export type ThemeLike = typeof themeLikes.$inferSelect;
export type PublisherSocialProfile = typeof publisherSocialProfiles.$inferSelect;
export type PublishSession = typeof publishSessions.$inferSelect;
export type NewPublishSession = typeof publishSessions.$inferInsert;
