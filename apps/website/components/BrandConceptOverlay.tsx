import Image from "next/image";

type BrandConceptConfig = {
  name: string;
  tone: string;
  components: readonly string[];
  image?: string;
  imageSize?: readonly [number, number];
  wordmark?: boolean;
};

const brandConcepts = {
  "spacex-launchpad": {
    name: "SpaceX",
    tone: "spacex",
    components: ["Launch", "Orbit", "Live"],
    image: "/brand-marks/spacex-wordmark.svg",
    imageSize: [400, 50],
    wordmark: true,
  },
  "google-spectrum": {
    name: "Google",
    tone: "google",
    components: ["Search", "Gemini", "Cloud"],
    image: "/brand-marks/google-logo.png",
    imageSize: [544, 184],
    wordmark: true,
  },
  "meta-horizon": {
    name: "Meta",
    tone: "meta",
    components: ["Connect", "Create", "Discover"],
    image: "/brand-marks/meta.svg",
    imageSize: [24, 24],
  },
  "openai-monochrome-lab": {
    name: "OpenAI",
    tone: "openai",
    components: ["Reason", "Create", "Ship"],
    image: "/brand-marks/openai-wordmark.webp",
    imageSize: [1042, 521],
    wordmark: true,
  },
  "nvidia-neon-compute": {
    name: "NVIDIA",
    tone: "nvidia",
    components: ["CUDA", "RTX", "AI"],
    image: "/brand-marks/nvidia-horizontal.png",
    imageSize: [700, 394],
    wordmark: true,
  },
  "apple-liquid-studio": {
    name: "Apple",
    tone: "apple",
    components: ["Design", "Build", "Focus"],
    image: "/brand-marks/apple.svg",
    imageSize: [24, 24],
  },
  "microsoft-fluent-grid": {
    name: "Microsoft",
    tone: "microsoft",
    components: ["Copilot", "Azure", "365"],
    image: "/brand-marks/microsoft-logo.png",
    imageSize: [216, 46],
    wordmark: true,
  },
  "tesla-cyber-garage": {
    name: "Tesla",
    tone: "tesla",
    components: ["Energy", "Drive", "Charge"],
    image: "/brand-marks/tesla.svg",
    imageSize: [24, 24],
  },
  "anthropic-warm-lab": {
    name: "Anthropic",
    tone: "anthropic",
    components: ["Research", "Safety", "Claude"],
    image: "/brand-marks/anthropic.svg",
    imageSize: [24, 24],
  },
  "amazon-orbit-logistics": {
    name: "Amazon",
    tone: "amazon",
    components: ["Build", "Deliver", "Scale"],
    image: "/brand-marks/amazon-logo.svg",
    imageSize: [100, 33],
    wordmark: true,
  },
  "x-signal-network": {
    name: "X",
    tone: "x",
    components: ["Post", "Spaces", "Trending"],
    image: "/brand-marks/x.svg",
    imageSize: [1200, 1227],
  },
} as const satisfies Record<string, BrandConceptConfig>;

export const brandConceptSlugs = Object.freeze(Object.keys(brandConcepts));

export function BrandConceptOverlay({ slug }: { slug?: string }) {
  const config: BrandConceptConfig | undefined = slug ? brandConcepts[slug as keyof typeof brandConcepts] : undefined;
  if (!config) return null;

  return (
    <div className={`mock-brand-concept mock-brand-concept--${config.tone}`}>
      <div
        aria-label={`${config.name} logo — unofficial fan concept`}
        className={`mock-brand-lockup${config.wordmark ? " mock-brand-lockup--wordmark" : ""}`}
        role="img"
      >
        {config.image ? (
          <Image
            alt=""
            aria-hidden="true"
            height={config.imageSize?.[1] ?? 100}
            src={config.image}
            unoptimized
            width={config.imageSize?.[0] ?? 320}
          />
        ) : null}
        {!config.wordmark && <strong>{config.name}</strong>}
      </div>
      <span className="mock-brand-fan-label">Unofficial fan concept</span>
      <div aria-hidden="true" className="mock-brand-components">
        {config.components.map((component) => <span key={component}>{component}</span>)}
      </div>
    </div>
  );
}
