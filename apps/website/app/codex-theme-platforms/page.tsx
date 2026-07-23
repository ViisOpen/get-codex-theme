import { SeoHubPage } from "@/components/SeoLandingPage";
import { createSeoHubMetadata, seoClusters } from "@/lib/seo-pages";

export const metadata = createSeoHubMetadata(seoClusters.platforms);

export default function CodexThemePlatformsPage() {
  return <SeoHubPage clusterKey="platforms" />;
}
