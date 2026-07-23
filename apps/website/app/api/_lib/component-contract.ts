import {
  COMPONENT_GROUPS,
  validateComponentContract,
  type ComponentCoverageReport,
} from "get-codex-theme/components";

export { COMPONENT_GROUPS };
export type { ComponentCoverageReport };

export function validateSubmissionComponentTokens(
  tokens: Record<string, unknown>,
) {
  const validation = validateComponentContract(tokens, {
    requirePublicMinimum: true,
  });
  return {
    errors: validation.errors,
    warnings: validation.warnings,
    coverage: validation.report,
  };
}
