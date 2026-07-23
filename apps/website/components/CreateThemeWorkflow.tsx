import { AccountCreateWizard } from "./AccountCreateWizard";

export function CreateThemeWorkflow({
  className = "mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24",
  id = "create-with-codex",
  returnTo = "/create",
  startingDirection,
}: {
  className?: string;
  id?: string;
  returnTo?: string;
  startingDirection?: string;
}) {
  return <section className={className} id={id}><AccountCreateWizard returnTo={returnTo} startingDirection={startingDirection} /></section>;
}
