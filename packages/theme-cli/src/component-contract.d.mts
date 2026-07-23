export const COMPONENT_SCHEMA_VERSION: 2;

export const COMPONENT_GROUPS: readonly [
  "foundation",
  "buttons",
  "icons",
  "overlaysAndForms",
  "taskArtifacts",
  "feedback",
  "utilityRoutes",
];

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number];
export type AuthoringPath = "focused" | "complete" | "assisted";

export type ComponentCoverageReport = {
  profile: "focused" | "complete";
  authoringPath: AuthoringPath;
  enabled: ComponentGroup[];
  customized: ComponentGroup[];
  generated: ComponentGroup[];
  inherited: ComponentGroup[];
  effectiveScore: number;
  customScore: number;
  complete: boolean;
};

export type ComponentValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  report: ComponentCoverageReport;
};

export const AUTHORING_PATHS: readonly AuthoringPath[];
export const COMPONENT_TOKEN_SPEC: Readonly<Record<ComponentGroup, Readonly<Record<string, readonly unknown[]>>>>;

export function deriveComponentTokens(palette: Record<string, string>): Record<ComponentGroup, Record<string, string | number>>;

export function createComponentContract(
  palette: Record<string, string>,
  options?: {
    path?: AuthoringPath;
    components?: string | ComponentGroup[];
    source?: "manual" | "image" | "brand";
    preset?: "soft" | "sharp" | "bold" | "glass";
  },
): Record<string, unknown>;

export function validateComponentContract(
  tokens: Record<string, unknown>,
  options?: { requirePublicMinimum?: boolean },
): ComponentValidationResult;

export function componentCoverageReport(tokens: Record<string, unknown>): ComponentCoverageReport;
