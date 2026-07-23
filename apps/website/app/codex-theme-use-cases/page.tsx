import { SeoHubPage } from "@/components/SeoLandingPage";
import { createSeoHubMetadata, seoClusters } from "@/lib/seo-pages";

export const metadata = createSeoHubMetadata(seoClusters.useCases);

export default function CodexThemeUseCasesPage() {
  return <SeoHubPage clusterKey="useCases" />;
}
