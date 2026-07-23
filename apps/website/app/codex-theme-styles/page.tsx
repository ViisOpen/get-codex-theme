import { SeoHubPage } from "@/components/SeoLandingPage";
import { createSeoHubMetadata, seoClusters } from "@/lib/seo-pages";

export const metadata = createSeoHubMetadata(seoClusters.styles);

export default function CodexThemeStylesPage() {
  return <SeoHubPage clusterKey="styles" />;
}
