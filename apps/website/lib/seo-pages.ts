import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export type SeoClusterKey = "styles" | "useCases" | "platforms";

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoGuidance = {
  title: string;
  body: string;
};

export type SeoRelatedPage = {
  cluster: SeoClusterKey;
  slug: string;
};

export type SeoLanding = {
  cluster: SeoClusterKey;
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  perspective: [string, string];
  guidanceTitle: string;
  guidance: SeoGuidance[];
  bestFor: string[];
  watchFor: string[];
  themeSlugs: [string, string];
  faq: [SeoFaq, SeoFaq, SeoFaq];
  related: [SeoRelatedPage, SeoRelatedPage, SeoRelatedPage, SeoRelatedPage];
  keywords: string[];
};

export type SeoCluster = {
  key: SeoClusterKey;
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  perspective: [string, string];
  principles: SeoGuidance[];
  faq: [SeoFaq, SeoFaq, SeoFaq];
};

export const seoClusterOrder: SeoClusterKey[] = ["styles", "useCases", "platforms"];

export const seoClusters: Record<SeoClusterKey, SeoCluster> = {
  styles: {
    key: "styles",
    path: "/codex-theme-styles",
    label: "Theme styles",
    eyebrow: "Codex theme style library",
    title: "Codex theme styles, chosen for real work.",
    metaTitle: "Codex Theme Styles for Desktop",
    metaDescription: "Compare glass, minimal, cozy, cyberpunk, pastel, dark, light, neon, space, and editorial Codex theme styles with practical readability guidance.",
    intro: "A visual direction is useful only when it protects the work surface. This library explains how ten popular Codex theme styles behave around code, controls, long sessions, and responsive desktop windows.",
    perspective: [
      "The same artwork can feel excellent in a wide hero mockup and fail inside a narrow task window. These guides judge a style by focal placement, surface contrast, overlay strength, and how much visual motion remains behind readable content.",
      "Every recommendation distinguishes native appearance choices from the optional unofficial background layer. A style page is a design brief, not a promise that Codex exposes a matching item in Settings > Appearance.",
    ],
    principles: [
      { title: "Protect the reading field", body: "Keep the left and central workspace quieter than the decorative edge so code and task text remain easy to scan." },
      { title: "Design for three ratios", body: "Evaluate 16:10, 16:9, and 4:3 crops instead of approving a single cinematic image." },
      { title: "Use contrast deliberately", body: "Treat canvas, surface, border, foreground, and accent as a system rather than choosing one attractive color." },
      { title: "Keep restoration obvious", body: "Prefer a reversible local pack with explicit start and restore steps over edits to the signed application." },
    ],
    faq: [
      { question: "What is the best Codex theme style?", answer: "There is no universal winner. Minimal and dark styles reduce peripheral noise, glass and neon styles create a stronger visual identity, while light and editorial styles work well in bright rooms. Choose for your environment and session length." },
      { question: "Do these styles appear in Codex Appearance settings?", answer: "Native light, dark, accent, and related options may appear there. Artwork-heavy styles use the optional unofficial local compatibility layer and do not become new entries in Settings > Appearance." },
      { question: "Can one image support every desktop window?", answer: "Yes, when the pack includes separate 16:10, 16:9, and 4:3 crops and keeps the important subject away from areas likely to be covered or removed. One unplanned source image is rarely enough." },
    ],
  },
  useCases: {
    key: "useCases",
    path: "/codex-theme-use-cases",
    label: "Use cases",
    eyebrow: "Codex themes by workflow",
    title: "Codex themes for the way you build.",
    metaTitle: "Codex Themes by Workflow and Audience",
    metaDescription: "Choose a Codex theme for developers, startups, brands, streamers, deep focus, designers, teams, or AI builders with workflow-specific advice.",
    intro: "A founder demo, an eight-hour debugging session, and a livestream do not need the same workspace. These guides start with the job to be done, then work backward to contrast, artwork, branding, and delivery choices.",
    perspective: [
      "Persona pages should answer operational questions, not simply attach an audience name to a generic theme. Each guide identifies what viewers notice, what the operator must read, and which visual choices can become a liability during real work.",
      "The outcome is a narrower brief: which assets to prepare, how much brand presence is appropriate, which preview states to inspect, and when a free template is a better starting point than a custom pack.",
    ],
    principles: [
      { title: "Start with task duration", body: "A ten-minute launch demo can tolerate more spectacle than a full day of implementation work." },
      { title: "Separate operator and audience", body: "Streamers and presenters need a scene that reads on video without making controls harder for the person driving." },
      { title: "Use branding as a system", body: "For teams, keep approved colors and logos separate from generated art so they remain legible and replaceable." },
      { title: "Choose the smallest useful pack", body: "Begin with a validated gallery theme when it solves the workflow; create and publish a new pack only when the brief truly requires it." },
    ],
    faq: [
      { question: "Should every team member use the same Codex theme?", answer: "Not necessarily. Share a common token and artwork baseline, then allow light or dark variants for room conditions and accessibility. Consistency should help recognition without forcing one luminance level on everyone." },
      { question: "Is a branded Codex theme useful outside marketing?", answer: "It can make workshops, demos, onboarding recordings, and shared development environments recognizable. For private day-to-day work, restrained branding usually performs better than a prominent campaign treatment." },
      { question: "Can I explore a workflow theme without an account?", answer: "Yes. Public theme and concept pages are available without an account. The creator guide provides a prompt for Codex, and the local CLI builds and validates your own pack; an account is needed only when publishing it." },
    ],
  },
  platforms: {
    key: "platforms",
    path: "/codex-theme-platforms",
    label: "Platforms and setup",
    eyebrow: "Codex theme setup decisions",
    title: "Codex theme setup, without the guesswork.",
    metaTitle: "Codex Theme Setup for Desktop",
    metaDescription: "Plan Codex themes for macOS, Windows, desktop ratios, background images, appearance settings, widescreen, multi-monitor, and reversible installs.",
    intro: "The visual idea is only half the job. A dependable theme pack must account for the operating system, window ratio, display arrangement, native settings, unofficial background behavior, and a clean way back to stock Codex.",
    perspective: [
      "These pages separate configuration that Codex exposes from behavior supplied by the reversible local runtime. That distinction matters for troubleshooting, support, and honest expectations about what will appear inside the app's settings.",
      "Platform guidance also treats cropping as a delivery problem. A background must survive wide displays, compact windows, and focus changes without hiding the subject under navigation or reducing text contrast.",
    ],
    principles: [
      { title: "Name the delivery layer", body: "Document whether a choice is native, a pack token, or an unofficial local background so users know where to adjust it." },
      { title: "Validate before activation", body: "Check the manifest, file dimensions, license record, and active pointer before starting the compatibility runtime." },
      { title: "Keep assets local", body: "A theme runtime should not read chats, credentials, unrelated files, or remote commands." },
      { title: "Make restore a first-class path", body: "Ship and test restore instructions beside install instructions, not as an afterthought." },
    ],
    faq: [
      { question: "Are Codex themes installed the same way on macOS and Windows?", answer: "The pack contract can be shared, but launch and restore scripts differ by platform. A quality pack keeps the manifest, artwork, and visual tokens cross-platform while the fixed-version CLI handles platform-specific behavior." },
      { question: "Will a custom background appear in Settings > Appearance?", answer: "No. Native options may appear there, but advanced artwork is provided by an unofficial loopback-only local compatibility layer. It remains separate from Codex's native theme list." },
      { question: "What image size should I use for Codex Desktop?", answer: "Start at 3200 × 2000 in a 16:10 landscape composition. From that source, prepare dedicated 16:10, 16:9, and 4:3 crops while preserving a quiet reading field." },
    ],
  },
};

const stylePages: SeoLanding[] = [
  {
    cluster: "styles",
    slug: "glass",
    label: "Glass",
    eyebrow: "Glass Codex theme",
    title: "A glass Codex theme that stays readable.",
    metaTitle: "Glass Codex Theme Design Guide",
    metaDescription: "Design a glass Codex theme with translucent surfaces, controlled blur, quiet focal placement, and responsive artwork that preserves code readability.",
    intro: "Glass works when translucency creates hierarchy instead of haze. The strongest version uses one atmospheric edge, opaque-enough work surfaces, and borders that remain visible over both bright and dark parts of the artwork.",
    perspective: [
      "Treat the background as light entering a room, not as content that must be seen everywhere. Put the most luminous aurora or gradient outside the main reading column, then let the surface layer absorb local contrast changes.",
      "Avoid stacking blur, glow, transparency, and saturated borders at equal strength. One dominant glass cue is enough; the remaining layers should make task titles, code blocks, and controls easier to separate.",
    ],
    guidanceTitle: "Build glass without the visual fog",
    guidance: [
      { title: "Use asymmetric light", body: "Place the brightest color field near the upper-right or far edge, leaving the center-left reading zone calm." },
      { title: "Raise surface opacity", body: "Use more opacity behind code and form controls than behind decorative panels; glass does not require every panel to be equally transparent." },
      { title: "Keep borders neutral", body: "A low-saturation white or charcoal border survives more background colors than a neon outline around every surface." },
      { title: "Test narrow crops", body: "In compact windows, remove the scenic edge before shrinking the readable workspace or moving the focal glow behind text." },
    ],
    bestFor: ["Cinematic personal workspaces with a restrained color field", "Product demos where depth helps distinguish layers", "Dark rooms and displays with reliable black levels"],
    watchFor: ["Bright artwork directly behind code", "Low-opacity surfaces that disappear on light crops", "Blur and glow that soften small text"],
    themeSlugs: ["aurora-glass", "rose-quartz"],
    faq: [
      { question: "Does a glass Codex theme need transparency everywhere?", answer: "No. Keep primary reading surfaces comparatively solid and reserve stronger transparency for secondary panels. The result still reads as glass while text contrast stays predictable." },
      { question: "What background works best for a glass theme?", answer: "Choose a broad gradient, aurora, or soft light field with few sharp details. A large quiet region is more useful than a detailed scene because panels will reveal different parts at different window sizes." },
      { question: "Can a light glass theme work?", answer: "Yes. Use pearl or tinted-white surfaces, darker borders, and a muted background. Check that white highlights do not erase panel edges or make secondary text look washed out." },
    ],
    related: [{ cluster: "styles", slug: "neon" }, { cluster: "styles", slug: "dark" }, { cluster: "useCases", slug: "streamers" }, { cluster: "platforms", slug: "background-image" }],
    keywords: ["glass Codex theme", "Codex glass UI", "translucent Codex theme", "Codex theme background"],
  },
  {
    cluster: "styles",
    slug: "minimal",
    label: "Minimal",
    eyebrow: "Minimal Codex theme",
    title: "A minimal Codex theme with less to ignore.",
    metaTitle: "Minimal Codex Theme for Focus",
    metaDescription: "Plan a minimal Codex theme with restrained accents, stable surfaces, low-detail artwork, and contrast choices designed for long coding sessions.",
    intro: "Minimal is not empty; it is an explicit hierarchy. A useful minimal theme removes competing decoration while preserving enough separation between the canvas, sidebar, task surface, code, and active controls.",
    perspective: [
      "Begin with the information density of the workspace, not a blank mood board. Thin borders, one accent, and a near-monochrome canvas work only when active and inactive states remain distinguishable at a glance.",
      "If you add artwork, use it as a distant tone or geometric anchor. The image should be recognizable when the workspace is empty and almost disappear once a task, terminal, or diff becomes the focus.",
    ],
    guidanceTitle: "Reduce noise without flattening hierarchy",
    guidance: [
      { title: "Choose one accent job", body: "Reserve the accent for active controls, focus rings, and a small number of semantic signals instead of decorative lines." },
      { title: "Keep surfaces distinct", body: "Use slight luminance steps between canvas, sidebar, elevated surface, and code block so minimal does not become ambiguous." },
      { title: "Remove fine texture", body: "Subtle grain often turns into compression noise and competes with small text; use broad fields or a single soft object." },
      { title: "Audit inactive states", body: "Muted text and disabled controls must remain readable even when the palette is intentionally quiet." },
    ],
    bestFor: ["Long implementation and review sessions", "Users who prefer native-looking restraint", "Small windows where every decorative element consumes attention"],
    watchFor: ["Insufficient contrast between adjacent panels", "Muted text that becomes functionally invisible", "A single accent color applied to every interactive state"],
    themeSlugs: ["obsidian-orbit", "cloud-atelier"],
    faq: [
      { question: "Is a minimal Codex theme the same as a dark theme?", answer: "No. Minimal describes hierarchy and decoration, while dark describes luminance. A minimal theme can be light, dark, warm, or cool as long as it limits competing visual signals." },
      { question: "Should a minimal theme use a background image?", answer: "It can, but the image should behave like atmosphere rather than a subject. Broad gradients, distant geometry, and edge-weighted light are safer than detailed scenes." },
      { question: "How many colors should a minimal theme use?", answer: "Start with a canvas, one or two surface levels, foreground, muted text, border, and one accent. More colors are reasonable only when they communicate a distinct semantic state." },
    ],
    related: [{ cluster: "styles", slug: "light" }, { cluster: "styles", slug: "dark" }, { cluster: "useCases", slug: "deep-focus" }, { cluster: "platforms", slug: "low-distraction" }],
    keywords: ["minimal Codex theme", "clean Codex theme", "focus Codex theme", "low distraction Codex UI"],
  },
  {
    cluster: "styles",
    slug: "cozy",
    label: "Cozy",
    eyebrow: "Cozy Codex theme",
    title: "A cozy Codex theme for unhurried work.",
    metaTitle: "Cozy Codex Theme Design Guide",
    metaDescription: "Create a cozy Codex theme with warm neutrals, tactile light, gentle contrast, and artwork that feels personal without reducing interface clarity.",
    intro: "Cozy themes replace clinical contrast with warm, familiar cues: paper, wood, amber light, soft fabric color, or a quiet evening atmosphere. The challenge is keeping that warmth from turning every surface beige and every state indistinct.",
    perspective: [
      "Use warmth in the canvas and background, then keep foreground text comparatively neutral. This separation lets the workspace feel inviting without tinting code, icons, and semantic colors into the same muddy family.",
      "A cozy image should suggest place without demanding attention. Large pools of lamplight, soft natural materials, and an uncluttered edge work better than a desk scene full of recognizable objects behind the interface.",
    ],
    guidanceTitle: "Add warmth while preserving precision",
    guidance: [
      { title: "Anchor with a neutral foreground", body: "Pair warm surfaces with charcoal or deep brown text that still has measurable separation from the canvas." },
      { title: "Use amber selectively", body: "Keep amber for light and emphasis; overusing it on text, borders, and controls makes the hierarchy feel sepia and flat." },
      { title: "Prefer broad material cues", body: "A paper-like field or soft wood tone survives cropping better than a literal room with many small objects." },
      { title: "Check evening and daylight", body: "Warm palettes can feel dim at noon, so test the lightest surface and muted text in a bright room." },
    ],
    bestFor: ["Writers and builders who dislike cold blue interfaces", "Personal workspaces used during evening sessions", "Editorial and lifestyle-oriented brands"],
    watchFor: ["Brown-on-brown code and muted text", "Orange accents that resemble warnings", "Decorative desk objects cropped under controls"],
    themeSlugs: ["solar-paper", "sage-workshop"],
    faq: [
      { question: "What colors make a Codex theme feel cozy?", answer: "Warm cream, stone, muted sage, amber, terracotta, and restrained brown work well. Keep the darkest text and important semantic colors distinct from the warm base." },
      { question: "Can a cozy theme still be dark?", answer: "Yes. Use deep chocolate, charcoal, or warm navy with amber edge light. Avoid lifting every surface into brown; dark cozy themes still need clear luminance steps." },
      { question: "Is texture useful in a cozy background?", answer: "Only at a broad scale. Fine paper grain and fabric texture can shimmer under compression or compete with text, while large tonal variation adds warmth without visual static." },
    ],
    related: [{ cluster: "styles", slug: "editorial" }, { cluster: "styles", slug: "light" }, { cluster: "useCases", slug: "designers" }, { cluster: "platforms", slug: "desktop" }],
    keywords: ["cozy Codex theme", "warm Codex theme", "Codex theme aesthetic", "soft developer theme"],
  },
  {
    cluster: "styles",
    slug: "cyberpunk",
    label: "Cyberpunk",
    eyebrow: "Cyberpunk Codex theme",
    title: "A cyberpunk Codex theme with controlled energy.",
    metaTitle: "Cyberpunk Codex Theme Guide",
    metaDescription: "Design a cyberpunk Codex theme with neon edge light, protected reading zones, disciplined accents, and responsive crops that avoid visual overload.",
    intro: "Cyberpunk succeeds through contrast between darkness and a few electric signals. It fails when every edge glows, the background becomes a city poster, and saturated color competes with syntax, diffs, warnings, and active controls.",
    perspective: [
      "Build the composition around a protected central or left reading field. Put architecture, speed lines, signage, or energy toward the outer edge where the scene remains visible without sitting behind the task surface.",
      "Choose one primary neon family and one secondary signal. Red and cyan can work together, for example, but they need separate roles so error states and focus states do not become visually interchangeable.",
    ],
    guidanceTitle: "Keep the spectacle at the edge",
    guidance: [
      { title: "Limit emissive colors", body: "Use one dominant neon and one small counter-accent; let neutral foreground text carry most of the interface." },
      { title: "Darken the reading zone", body: "A deliberate shadow or overlay behind the workspace is more reliable than hoping translucent panels absorb every bright sign." },
      { title: "Avoid tiny signage", body: "Generated symbols and text-like marks look broken when cropped or blurred, so favor abstract light and architecture." },
      { title: "Preserve semantic red", body: "If the visual accent is red, differentiate errors with shape, placement, and luminance rather than color alone." },
    ],
    bestFor: ["Livestreams, demos, and high-energy personal setups", "Dark rooms with calibrated displays", "Users who want a recognizable sci-fi workspace"],
    watchFor: ["Neon directly behind code or task titles", "Red accents that obscure error semantics", "Detailed city scenes that fail narrow-window crops"],
    themeSlugs: ["signal-drive", "midnight-grid"],
    faq: [
      { question: "How do I keep a cyberpunk Codex theme readable?", answer: "Move the brightest subject to the edge, use a strong dark overlay behind content, and reserve neon for a few active states. Neutral text should still dominate the interface." },
      { question: "Which image prompt works for cyberpunk backgrounds?", answer: "Ask for abstract architecture, directional light, a quiet central reading field, no text or logos, and important detail in the outer third. Specify 16:10 landscape at 3200 × 2000." },
      { question: "Can cyberpunk work as a light theme?", answer: "It is possible but harder. Use a pale industrial canvas with dark structural lines and a restrained electric accent instead of trying to reproduce night-city glow on white." },
    ],
    related: [{ cluster: "styles", slug: "neon" }, { cluster: "styles", slug: "space" }, { cluster: "useCases", slug: "streamers" }, { cluster: "platforms", slug: "widescreen" }],
    keywords: ["cyberpunk Codex theme", "sci fi Codex theme", "neon developer theme", "Codex cyberpunk background"],
  },
  {
    cluster: "styles",
    slug: "pastel",
    label: "Pastel",
    eyebrow: "Pastel Codex theme",
    title: "A pastel Codex theme with real contrast.",
    metaTitle: "Pastel Codex Theme Design Guide",
    metaDescription: "Build a pastel Codex theme with soft color, readable dark text, distinct surfaces, and responsive artwork that avoids washed-out controls.",
    intro: "Pastel themes are defined by low chroma and high lightness, not by weak contrast. Soft pink, lavender, mint, peach, and sky can support serious work when text, borders, and active states use a firmer neutral structure.",
    perspective: [
      "Start with a dark foreground and decide which pastel owns the canvas, which belongs to elevated surfaces, and which is reserved for the accent. Equal amounts of several soft colors can make the workspace feel like an undifferentiated gradient.",
      "Artwork should use large mineral, cloud, or paper-like forms. Keep highlights away from white panels, because a pale background and a translucent light surface can erase the very edge that defines the interface.",
    ],
    guidanceTitle: "Make soft color operational",
    guidance: [
      { title: "Use a firm text neutral", body: "Choose charcoal, plum-black, or blue-gray foreground instead of a darker version of every pastel." },
      { title: "Separate pale surfaces", body: "Add a visible border or luminance step where white and tinted panels meet a light background." },
      { title: "Keep accent saturation higher", body: "A slightly stronger accent helps focus rings and selected controls remain recognizable without making the entire palette loud." },
      { title: "Test grayscale hierarchy", body: "If the main panel, sidebar, and controls merge in grayscale, color alone is carrying too much structural work." },
    ],
    bestFor: ["Light workspaces and daytime environments", "Lifestyle, education, and creative product demos", "Users who want color without neon intensity"],
    watchFor: ["White surfaces disappearing into pale artwork", "Muted text below comfortable contrast", "Too many equally weighted pastel hues"],
    themeSlugs: ["rose-quartz", "cloud-atelier"],
    faq: [
      { question: "Are pastel Codex themes accessible?", answer: "They can be, but the pastel color should not carry text contrast by itself. Use a dark neutral foreground, visible borders, and strong focus states, then check the result with a contrast tool." },
      { question: "Which pastel color is easiest to use?", answer: "Muted sky and sage are forgiving because they pair naturally with dark blue-gray or charcoal text. Very pale yellow and pink need more careful surface separation." },
      { question: "Can I use a pastel image behind a dark Codex mode?", answer: "Yes. Dark translucent surfaces over soft artwork can create strong depth. Keep the brightest pastel away from code and ensure the overlay does not turn every color muddy." },
    ],
    related: [{ cluster: "styles", slug: "light" }, { cluster: "styles", slug: "glass" }, { cluster: "useCases", slug: "designers" }, { cluster: "platforms", slug: "appearance-settings" }],
    keywords: ["pastel Codex theme", "soft Codex theme", "pink Codex theme", "light colorful Codex theme"],
  },
  {
    cluster: "styles",
    slug: "dark",
    label: "Dark",
    eyebrow: "Dark Codex theme",
    title: "A dark Codex theme tuned for long sessions.",
    metaTitle: "Dark Codex Theme Design Guide",
    metaDescription: "Choose a dark Codex theme with controlled black levels, readable surfaces, restrained highlights, and artwork designed for extended desktop work.",
    intro: "A dark theme is more than black canvas and bright text. Comfortable dark work depends on moderate foreground contrast, visible surface steps, disciplined saturated color, and a background that does not create glare in the periphery.",
    perspective: [
      "Pure black can look striking on OLED displays but makes adjacent near-black surfaces hard to distinguish. A deep charcoal or tinted navy canvas often gives sidebars, code blocks, and elevated panels more room to form a hierarchy.",
      "The background should add depth at low intensity. A localized glow or broad gradient is easier on the eyes than thin high-contrast lines repeated across the whole display.",
    ],
    guidanceTitle: "Control contrast instead of maximizing it",
    guidance: [
      { title: "Lift the canvas slightly", body: "Use very dark charcoal, navy, or plum so black shadows and elevated surfaces still have somewhere to go." },
      { title: "Soften secondary text", body: "Reduce muted text carefully while keeping instructions and timestamps readable; do not dim information merely because it is secondary." },
      { title: "Localize the glow", body: "Keep the brightest background light in one outer region instead of surrounding every panel with contrast." },
      { title: "Test black crush", body: "Check the theme on more than one display so borders and surface steps do not vanish on a monitor with deeper blacks." },
    ],
    bestFor: ["Evening work and low-light rooms", "Long coding sessions with reduced peripheral luminance", "Cinematic or technical visual directions"],
    watchFor: ["Pure black surfaces with invisible boundaries", "White text that feels harsh over hours", "Saturated accents repeated across large areas"],
    themeSlugs: ["obsidian-orbit", "midnight-grid"],
    faq: [
      { question: "Is pure black the best dark Codex theme background?", answer: "Not always. Pure black suits some OLED setups, but near-black charcoal or navy usually creates clearer separation between the canvas, sidebar, and elevated content." },
      { question: "What foreground color is comfortable on dark themes?", answer: "Use an off-white or lightly tinted foreground rather than maximum white. Keep body text strong, then step secondary text down without crossing into low-contrast gray." },
      { question: "Do dark themes save battery on every computer?", answer: "Meaningful power savings mainly apply to OLED displays showing true black pixels. Theme choice should still prioritize readability and room conditions rather than assuming a universal battery benefit." },
    ],
    related: [{ cluster: "styles", slug: "minimal" }, { cluster: "styles", slug: "space" }, { cluster: "useCases", slug: "developers" }, { cluster: "platforms", slug: "low-distraction" }],
    keywords: ["dark Codex theme", "Codex dark mode theme", "black Codex theme", "dark developer workspace"],
  },
  {
    cluster: "styles",
    slug: "light",
    label: "Light",
    eyebrow: "Light Codex theme",
    title: "A light Codex theme built for daylight.",
    metaTitle: "Light Codex Theme Design Guide",
    metaDescription: "Choose a light Codex theme with controlled whites, visible surface boundaries, calm accents, and artwork that remains readable in bright rooms.",
    intro: "A good light theme feels open without becoming a white field with floating controls. Slightly tinted canvases, clear border values, dark neutral text, and restrained highlights make the workspace comfortable in real daylight.",
    perspective: [
      "Avoid using maximum white for every layer. A cool, warm, or natural off-white canvas lets elevated surfaces become lighter while borders remain visible without heavy outlines.",
      "Background imagery should be pale but structured. Clouds, paper, minerals, and soft architecture work when their brightest region stays away from white cards and their darker region does not sit behind body text.",
    ],
    guidanceTitle: "Use brightness without losing edges",
    guidance: [
      { title: "Tint the canvas", body: "A small amount of blue, sage, cream, or rose gives white panels a visible home and reduces clinical glare." },
      { title: "Use dark neutral text", body: "Charcoal or blue-black reads more comfortably than absolute black while maintaining strong contrast." },
      { title: "Give controls a boundary", body: "Inputs and code blocks need a border or surface shift that remains visible over every part of the background." },
      { title: "Check direct sunlight", body: "Muted labels and subtle dividers that look elegant indoors may disappear on a bright laptop display." },
    ],
    bestFor: ["Daytime work and bright offices", "Screenshots, workshops, and printed documentation", "Users who prefer low visual density and warm or airy palettes"],
    watchFor: ["White-on-white surface collapse", "Pastel text used for essential information", "Background shadows that look like dirty patches behind panels"],
    themeSlugs: ["cloud-atelier", "solar-paper"],
    faq: [
      { question: "What is the best background color for a light Codex theme?", answer: "Use a slightly tinted off-white rather than pure white. Cool gray-blue, warm cream, or very light sage creates room for white elevated surfaces and dark text." },
      { question: "Can a light theme use a photograph?", answer: "Yes, if the photo is simplified, low-detail, and composed with a quiet reading field. Architectural haze and broad natural forms are safer than busy desk or landscape scenes." },
      { question: "Why do light themes need stronger borders?", answer: "Adjacent high-lightness surfaces have less luminance separation. A restrained border or shadow makes controls and panels recognizable without relying on color alone." },
    ],
    related: [{ cluster: "styles", slug: "pastel" }, { cluster: "styles", slug: "editorial" }, { cluster: "useCases", slug: "startups" }, { cluster: "platforms", slug: "appearance-settings" }],
    keywords: ["light Codex theme", "Codex light mode theme", "white Codex theme", "daylight developer theme"],
  },
  {
    cluster: "styles",
    slug: "neon",
    label: "Neon",
    eyebrow: "Neon Codex theme",
    title: "A neon Codex theme with a signal hierarchy.",
    metaTitle: "Neon Codex Theme Design Guide",
    metaDescription: "Create a neon Codex theme with focused glow, semantic color separation, quiet reading surfaces, and desktop crops that keep energy under control.",
    intro: "Neon is useful when it behaves like a signal system. One electric accent can clarify focus and selection; several equal glows turn the workspace into a light wall where errors, links, and active controls lose meaning.",
    perspective: [
      "Decide what emits light and what merely reflects it. The background may carry a broad colored bloom, while controls use crisp accent edges and text remains mostly neutral.",
      "Preserve semantic color space before choosing the decorative palette. If magenta is the brand accent and red marks destructive actions, their luminance and placement must remain distinguishable even under a colorful background.",
    ],
    guidanceTitle: "Turn glow into useful emphasis",
    guidance: [
      { title: "Assign one emissive accent", body: "Use the strongest neon for focus and selected states, then keep secondary accents smaller and less luminous." },
      { title: "Keep text non-emissive", body: "Glowing body text blooms on some displays and becomes tiring; reserve glow for shapes or short labels." },
      { title: "Create dark landing zones", body: "Panels need stable near-black areas so the background bloom does not change contrast from one crop to another." },
      { title: "Review color-blind states", body: "Use iconography, shape, and position alongside color where neon accents overlap with success or error semantics." },
    ],
    bestFor: ["Short demos, streams, and expressive personal setups", "Dark workspaces with carefully calibrated accents", "Brands that already own a strong electric color"],
    watchFor: ["Glowing body text and thin outlines", "Multiple accents competing for focus", "Decorative red or green that mimics semantic states"],
    themeSlugs: ["signal-drive", "aurora-glass"],
    faq: [
      { question: "Which neon color works best in a Codex theme?", answer: "Blue, cyan, violet, and magenta are flexible because they are less likely to collide with error and success colors. Any choice still needs neutral text and a clear semantic palette." },
      { question: "How much glow should a neon theme use?", answer: "Enough to identify the focal edge and active state, not enough to soften every boundary. If the interface feels blurred in grayscale, reduce the bloom." },
      { question: "Can neon themes support long coding sessions?", answer: "Yes when the neon occupies a small percentage of the frame and the reading surfaces remain stable and dark. Full-screen saturated backgrounds are better suited to short presentation scenes." },
    ],
    related: [{ cluster: "styles", slug: "cyberpunk" }, { cluster: "styles", slug: "glass" }, { cluster: "useCases", slug: "brands" }, { cluster: "platforms", slug: "background-image" }],
    keywords: ["neon Codex theme", "glowing Codex theme", "colorful dark Codex theme", "Codex neon background"],
  },
  {
    cluster: "styles",
    slug: "space",
    label: "Space",
    eyebrow: "Space Codex theme",
    title: "A space Codex theme with room to think.",
    metaTitle: "Space Codex Theme Design Guide",
    metaDescription: "Design a space Codex theme with restrained stars, orbital light, deep surfaces, and responsive compositions that keep the workspace calm.",
    intro: "Space imagery naturally offers depth and negative space, which makes it a strong desktop theme direction. The best compositions use one planet, horizon, or orbital glow and leave the main work area closer to a quiet night sky.",
    perspective: [
      "Scale matters. A large atmospheric arc or distant light survives cropping, while a detailed spacecraft or cluster of planets can be cut apart across 16:10, 16:9, and 4:3 windows.",
      "Stars should read as texture only at a distance. Dense, high-contrast star fields create visual static behind code and can resemble dust or dead pixels around small interface elements.",
    ],
    guidanceTitle: "Use depth, not a crowded galaxy",
    guidance: [
      { title: "Choose one celestial anchor", body: "Place a planet edge, horizon, or glow in the outer third and keep it large enough to survive alternate crops." },
      { title: "Reduce star density", body: "Use sparse, low-contrast points and remove them entirely from the protected reading field." },
      { title: "Tint near-black surfaces", body: "A subtle navy or violet cast preserves the space mood while keeping panels distinguishable from the canvas." },
      { title: "Avoid literal cockpit UI", body: "Generated interface markings conflict with the real Codex interface and often contain broken text-like artifacts." },
    ],
    bestFor: ["Deep-focus dark workspaces", "Technical and exploratory brand directions", "Wide displays where an edge-weighted horizon has room"],
    watchFor: ["Dense stars behind small type", "A central planet hidden by the task panel", "Fake cockpit labels that compete with real controls"],
    themeSlugs: ["obsidian-orbit", "aurora-glass"],
    faq: [
      { question: "What kind of space image works behind Codex?", answer: "Use a large atmospheric form, sparse stars, and a dark quiet reading zone. Avoid detailed ships, multiple planets, or text-like cockpit graphics." },
      { question: "Should a space theme always be dark?", answer: "No. A pale lunar surface, bright atmospheric horizon, or minimal scientific illustration can support a light theme, provided panel boundaries remain visible." },
      { question: "How do I crop a planet for multiple ratios?", answer: "Keep the meaningful arc away from the exact edge and retain extra space around it. Preview the subject at 16:10, 16:9, and 4:3 before approving the source." },
    ],
    related: [{ cluster: "styles", slug: "dark" }, { cluster: "styles", slug: "minimal" }, { cluster: "useCases", slug: "deep-focus" }, { cluster: "platforms", slug: "widescreen" }],
    keywords: ["space Codex theme", "galaxy Codex theme", "orbital developer theme", "Codex space background"],
  },
  {
    cluster: "styles",
    slug: "editorial",
    label: "Editorial",
    eyebrow: "Editorial Codex theme",
    title: "An editorial Codex theme with clear rhythm.",
    metaTitle: "Editorial Codex Theme Design Guide",
    metaDescription: "Create an editorial Codex theme with warm paper, typographic restraint, structured spacing, and responsive imagery that supports writing and review.",
    intro: "Editorial themes borrow from books, magazines, and studio layouts: warm paper, deliberate whitespace, disciplined rules, and a clear reading rhythm. They work best when the interface remains modern rather than imitating a printed page literally.",
    perspective: [
      "Let the canvas carry the material cue while controls keep a clean digital structure. Cream, ink, and amber can establish the mood without adding fake page folds, printed text, or decorative typography behind the real workspace.",
      "The accent should behave like an annotation mark: noticeable in small areas, quiet everywhere else. Strong orange, red, or blue can work when selection and focus use it consistently.",
    ],
    guidanceTitle: "Borrow rhythm, not print decoration",
    guidance: [
      { title: "Use warm material broadly", body: "A cream or paper-toned canvas is more durable than a literal page image with shadows, folds, and printed artifacts." },
      { title: "Keep interface type native", body: "Do not place generated headlines or serif text in the artwork; let the product typography remain the only readable language." },
      { title: "Treat accent as annotation", body: "Use one ink-like highlight for active states and key calls rather than coloring every border." },
      { title: "Preserve generous edges", body: "Leave visual breathing room around the composition so narrow crops do not feel like a cut-off magazine cover." },
    ],
    bestFor: ["Writing, planning, review, and content workflows", "Warm light themes used during the day", "Studios and brands with publishing or craft references"],
    watchFor: ["Fake printed text in generated artwork", "Paper texture that becomes compression noise", "Warm accents that resemble warning states"],
    themeSlugs: ["solar-paper", "cloud-atelier"],
    faq: [
      { question: "What makes a Codex theme editorial?", answer: "A warm material base, clear spacing rhythm, restrained rules, and one annotation-like accent create the editorial feeling. Literal magazine graphics are not required." },
      { question: "Should an editorial theme use serif fonts?", answer: "The background and palette can feel editorial while the interface keeps its readable product typography. Font replacement is a separate, higher-risk customization and should not be assumed." },
      { question: "Which image prompt suits an editorial theme?", answer: "Ask for abstract paper, soft studio light, large quiet fields, no text, no logos, and a composition weighted toward the outer third at 3200 × 2000." },
    ],
    related: [{ cluster: "styles", slug: "cozy" }, { cluster: "styles", slug: "light" }, { cluster: "useCases", slug: "designers" }, { cluster: "platforms", slug: "desktop" }],
    keywords: ["editorial Codex theme", "paper Codex theme", "warm light Codex theme", "writer Codex theme"],
  },
];

const useCasePages: SeoLanding[] = [
  {
    cluster: "useCases",
    slug: "developers",
    label: "Developers",
    eyebrow: "Codex themes for developers",
    title: "Codex themes built for long development sessions.",
    metaTitle: "Codex Themes for Developers",
    metaDescription: "Choose a Codex theme for development with stable contrast, low-distraction artwork, practical crops, and a reversible desktop setup.",
    intro: "A developer theme earns its place after the novelty wears off. It should make the active task obvious, keep code and diffs readable, and leave enough visual identity to make the workspace feel personal through a full day of building.",
    perspective: [
      "Optimize first for the state you see most often: a dense task with code, terminal output, or a review. A dramatic empty-state background is useful for personality, but the covered workspace is where contrast and surface separation have to perform.",
      "For daily use, choose a restrained accent and an edge-weighted image. Treat installation as part of the experience too: local validation, an explicit active pack, and a tested restore path matter more than an elaborate visual trick.",
    ],
    guidanceTitle: "Design around the working state",
    guidance: [
      { title: "Preview dense tasks", body: "Judge the theme with code, long output, selected rows, and inactive controls—not only on the clean home screen." },
      { title: "Protect semantic colors", body: "Keep the decorative accent distinct from error, warning, success, and diff colors so status remains legible." },
      { title: "Quiet the center-left", body: "Move the strongest artwork away from navigation and primary reading surfaces, especially in compact windows." },
      { title: "Test restore before adopting", body: "A daily tool needs a dependable return to stock Codex; verify that path before making the pack part of your routine." },
    ],
    bestFor: ["Long coding, debugging, and review sessions", "Developers who want identity without constant visual noise", "Personal setups that must remain practical at narrow widths"],
    watchFor: ["Accents that collide with diff and error colors", "Artwork approved only in an empty mockup", "Low-contrast muted text during long output"],
    themeSlugs: ["midnight-grid", "obsidian-orbit"],
    faq: [
      { question: "What Codex theme is best for developers?", answer: "Start with a minimal dark or restrained light theme that has stable surfaces and one accent. The best choice is the one that keeps code, diffs, task states, and controls clear in your normal room lighting." },
      { question: "Will a background image make coding harder?", answer: "Not when the image has a quiet reading field, dedicated responsive crops, and sufficient surface opacity. Detailed scenes placed behind the workspace are more likely to create fatigue." },
      { question: "Can I switch back to normal Codex?", answer: "A well-formed pack includes a documented restore path. Advanced backgrounds use an unofficial local compatibility layer, so restoration should stop that layer and return Codex to its native appearance." },
    ],
    related: [{ cluster: "styles", slug: "minimal" }, { cluster: "styles", slug: "dark" }, { cluster: "platforms", slug: "low-distraction" }, { cluster: "platforms", slug: "desktop" }],
    keywords: ["Codex themes for developers", "developer Codex theme", "coding workspace theme", "Codex desktop customization"],
  },
  {
    cluster: "useCases",
    slug: "startups",
    label: "Startups",
    eyebrow: "Codex themes for startups",
    title: "A startup Codex theme that looks ready to ship.",
    metaTitle: "Codex Themes for Startups",
    metaDescription: "Plan a startup Codex theme for product demos, launch recordings, and daily building with restrained branding and readable workspace states.",
    intro: "For a startup, the theme often appears in more places than the founder expects: launch videos, support clips, investor demos, workshops, and screenshots. It should feel recognizably yours without turning the development surface into a marketing banner.",
    perspective: [
      "Use the brand system as a source, not a stencil. One approved accent, a related background atmosphere, and a discreet mark are usually enough to connect the workspace to the product while leaving the interface in charge.",
      "Plan two presentation conditions: a clean home view for the opening frame and a realistic task view for the actual demo. If either becomes illegible after video compression or screen sharing, simplify the art before adding more branding.",
    ],
    guidanceTitle: "Turn brand signals into a usable workspace",
    guidance: [
      { title: "Choose one owned cue", body: "Carry a distinctive brand color, gradient, or shape into the theme instead of copying the entire marketing site." },
      { title: "Design for compression", body: "Avoid fine grain, tiny logos, and subtle panel boundaries that disappear in livestreams and recorded demos." },
      { title: "Prepare light and dark options", body: "A second luminance mode helps teams present in different rooms without abandoning the same visual family." },
      { title: "Keep campaign copy out", body: "Do not bake taglines or launch text into the image; they age quickly and generated lettering is unreliable." },
    ],
    bestFor: ["Launch demos and founder-led product videos", "Small teams that want a shared visual baseline", "Workshops where the development environment is visible"],
    watchFor: ["Oversized logos behind the task surface", "Fine details lost in video compression", "A campaign treatment that becomes stale after launch"],
    themeSlugs: ["cloud-atelier", "signal-drive"],
    faq: [
      { question: "Should a startup Codex theme include the company logo?", answer: "It can, but keep the mark small, place it in a safe outer region, and retain a version without it. Color and composition often create stronger, more durable recognition than a large logo." },
      { question: "Is a startup theme only for demos?", answer: "No. A restrained version can work daily, while a more expressive variant can serve launches and recordings. Both should share the same approved palette and artwork direction." },
      { question: "What assets should a startup prepare?", answer: "Provide vector logos, brand color values, light and dark usage rules, reference imagery you own, and examples of visual treatments to avoid. Do not upload confidential product material." },
    ],
    related: [{ cluster: "styles", slug: "light" }, { cluster: "styles", slug: "minimal" }, { cluster: "platforms", slug: "multi-monitor" }, { cluster: "useCases", slug: "brands" }],
    keywords: ["Codex theme for startups", "startup developer theme", "branded Codex workspace", "Codex demo theme"],
  },
  {
    cluster: "useCases",
    slug: "brands",
    label: "Brands",
    eyebrow: "Branded Codex themes",
    title: "A branded Codex theme with a lighter touch.",
    metaTitle: "Branded Codex Themes for Companies",
    metaDescription: "Create a branded Codex theme using approved assets, controlled logo placement, accessible color roles, and delivery guidance for teams and demos.",
    intro: "A branded workspace should feel designed by the company, not wrapped in an advertisement. The useful brief translates brand color, atmosphere, and graphic language into surfaces that still respect code, controls, status colors, and long-session comfort.",
    perspective: [
      "Separate fixed brand assets from generated imagery. Logos, marks, and exact colors should come from approved source files; image generation can explore atmosphere and composition, but it should not redraw identity assets or invent lettering.",
      "Build a hierarchy of recognition. The palette should do most of the work, the background can carry a distinctive visual motif, and the logo should confirm ownership from a safe edge rather than occupy the primary reading field.",
    ],
    guidanceTitle: "Translate identity without overwhelming the tool",
    guidance: [
      { title: "Request source assets", body: "Use SVG or high-resolution transparent marks plus documented color values instead of screenshots from a website." },
      { title: "Map colors to roles", body: "Define which brand color is an accent, which surfaces are neutral, and how warnings and errors remain distinct." },
      { title: "Offer a no-logo variant", body: "Some daily workflows benefit from the brand atmosphere without a visible mark; package both when internal adoption matters." },
      { title: "Record asset rights", body: "Keep a license or ownership note for uploaded imagery and logos inside the pack rather than relying on memory." },
    ],
    bestFor: ["Company workshops, demos, and official recordings", "Developer relations and branded technical content", "Teams with an established visual system"],
    watchFor: ["Generated or distorted logos", "Brand accents that replace semantic colors", "Artwork licensed only for a narrow campaign use"],
    themeSlugs: ["aurora-glass", "solar-paper"],
    faq: [
      { question: "Can a company use its exact brand colors in a Codex theme?", answer: "Yes, but each color needs an interface role and adequate contrast. A vivid brand color usually works best as an accent rather than the base of every surface." },
      { question: "Should AI generate the company logo in the background?", answer: "No. Use the approved logo file as a separate controlled asset. Generate only the surrounding atmosphere or abstract artwork, then place the original mark in a safe region." },
      { question: "How do teams review a branded theme?", answer: "Review home, active task, code, dialog, and narrow-window previews in both normal screenshots and compressed video. Include design, accessibility, legal, and the people who will use it daily." },
    ],
    related: [{ cluster: "styles", slug: "neon" }, { cluster: "styles", slug: "editorial" }, { cluster: "platforms", slug: "background-image" }, { cluster: "useCases", slug: "teams" }],
    keywords: ["branded Codex theme", "company Codex theme", "custom Codex branding", "brand developer workspace"],
  },
  {
    cluster: "useCases",
    slug: "streamers",
    label: "Streamers",
    eyebrow: "Codex themes for streamers",
    title: "A Codex theme that reads clearly on stream.",
    metaTitle: "Codex Themes for Streamers",
    metaDescription: "Design a Codex streaming theme with clear video compression, safe focal placement, expressive edge light, and readable controls for the host.",
    intro: "A streaming theme serves two people at once: the builder operating Codex and the viewer watching a compressed, possibly scaled video feed. Strong silhouettes and controlled contrast survive that journey better than tiny detail or elaborate generated scenery.",
    perspective: [
      "Compose for the broadcast frame, including camera, chat, captions, and platform overlays. The most attractive corner of the Codex background may be covered in the final scene, so decide safe zones before generating the artwork.",
      "Give the audience a recognizable opening view, then prioritize the operator once work begins. Buttons, focused fields, code selection, and task status must remain obvious even when the stream preview is smaller than the original display.",
    ],
    guidanceTitle: "Design through the capture pipeline",
    guidance: [
      { title: "Map stream overlays first", body: "Mark the camera, chat, caption, and sponsor regions before placing the background subject or logo." },
      { title: "Use broad color blocks", body: "Large gradients and edge light survive video compression better than grain, stars, or thin neon lines." },
      { title: "Preview at viewer size", body: "Shrink the captured scene to the likely playback size and confirm that active controls and task status remain obvious." },
      { title: "Keep a quiet work mode", body: "Pair the showier opening state with a lower-intensity variant for longer live coding segments." },
    ],
    bestFor: ["Live coding, product walkthroughs, and recorded tutorials", "Creators with a consistent scene package", "Short demos that benefit from a memorable opening frame"],
    watchFor: ["Artwork hidden under camera or chat overlays", "Fine effects destroyed by compression", "A bright theme that tires the operator before the audience"],
    themeSlugs: ["signal-drive", "aurora-glass"],
    faq: [
      { question: "What kind of Codex theme looks best on stream?", answer: "Use a dark or mid-tone canvas, broad edge lighting, strong panel separation, and one recognizable color. Test the full scene after encoding rather than judging only a local screenshot." },
      { question: "Where should a logo go in a streaming theme?", answer: "Place it in an outer safe region that is not covered by camera, chat, captions, or Codex controls. Keep the original logo separate from generated art so it stays sharp." },
      { question: "Do I need a different crop for streaming?", answer: "Often yes. The capture may be 16:9 even when the host display is 16:10 or ultrawide. Deliver a dedicated broadcast crop alongside desktop and compact variants." },
    ],
    related: [{ cluster: "styles", slug: "cyberpunk" }, { cluster: "styles", slug: "glass" }, { cluster: "platforms", slug: "widescreen" }, { cluster: "useCases", slug: "brands" }],
    keywords: ["Codex theme for streamers", "live coding theme", "Codex streaming background", "developer stream setup"],
  },
  {
    cluster: "useCases",
    slug: "deep-focus",
    label: "Deep focus",
    eyebrow: "Codex themes for deep focus",
    title: "A deep-focus Codex theme that knows when to disappear.",
    metaTitle: "Deep-Focus Codex Themes",
    metaDescription: "Choose a deep-focus Codex theme with low-detail artwork, stable surfaces, restrained accents, and comfortable contrast for long sessions.",
    intro: "Deep focus does not require a visually empty workspace. It requires predictable attention: the active task is strongest, supporting controls are available without calling out, and the background creates atmosphere only around the edges.",
    perspective: [
      "Reduce change before reducing beauty. Moving particles, high-frequency texture, luminous borders, and multiple accent colors interrupt scanning more than a single large illustration positioned away from the work surface.",
      "Comfort also depends on the room. A low-luminance theme may be ideal at night but muddy in daylight, so define a companion light or mid-tone option instead of forcing one palette into every environment.",
    ],
    guidanceTitle: "Make attention predictable",
    guidance: [
      { title: "Build a stable contrast ladder", body: "Keep canvas, primary surface, code surface, foreground, and muted text clearly ordered across every crop." },
      { title: "Remove repeated highlights", body: "Many equally bright borders create dozens of false focal points; emphasize the active state and soften the rest." },
      { title: "Choose low-frequency art", body: "One broad horizon, gradient, or geometric form is calmer than fine texture distributed across the whole window." },
      { title: "Match the room", body: "Maintain dark and light alternatives for night and daylight rather than compensating with extreme display brightness." },
    ],
    bestFor: ["Extended implementation, reading, and debugging", "Users sensitive to decorative motion or repeated glow", "Small or split-screen Codex windows"],
    watchFor: ["Muted text pushed below comfortable contrast", "Uniform darkness that hides panel boundaries", "A calm home screen that becomes noisy with code"],
    themeSlugs: ["obsidian-orbit", "midnight-grid"],
    faq: [
      { question: "Is dark mode always better for deep focus?", answer: "No. Dark themes can reduce glare in dim rooms, while light or mid-tone themes may be clearer in daylight. Stable hierarchy and controlled accents matter more than mode alone." },
      { question: "Should a focus theme remove the background image?", answer: "Not necessarily. A broad, edge-weighted image can add a sense of place without competing with work. Remove it if it introduces detail or contrast changes behind the reading field." },
      { question: "How do I test a Codex theme for distraction?", answer: "Work with it for a realistic session, switch between home, active task, code, and dialogs, then note which elements draw your eye without carrying useful status. Reduce those elements first." },
    ],
    related: [{ cluster: "styles", slug: "minimal" }, { cluster: "styles", slug: "space" }, { cluster: "platforms", slug: "low-distraction" }, { cluster: "useCases", slug: "developers" }],
    keywords: ["deep focus Codex theme", "distraction free Codex", "focus developer theme", "calm coding workspace"],
  },
  {
    cluster: "useCases",
    slug: "designers",
    label: "Designers",
    eyebrow: "Codex themes for designers",
    title: "A Codex theme for designers who notice the details.",
    metaTitle: "Codex Themes for Designers",
    metaDescription: "Plan a designer-friendly Codex theme with disciplined color roles, responsive composition, accessible states, and presentation-ready previews.",
    intro: "Designers can push a theme beyond generic dark mode, but the best result still behaves like a product surface. It needs a coherent material idea, intentional spacing, accessible interaction states, and artwork that survives real window geometry.",
    perspective: [
      "Define the system before polishing the hero frame. Name the canvas, elevated surface, code surface, foreground, muted foreground, border, accent, and semantic colors, then inspect how they interact over the chosen image.",
      "Use the preview as a critique tool rather than a sales mockup. Home, dense task, dialog, and narrow views reveal different problems; a successful theme maintains its idea even after the decorative subject is mostly cropped away.",
    ],
    guidanceTitle: "Treat the theme as a small design system",
    guidance: [
      { title: "Write color roles", body: "Document why each token exists so revisions change a system instead of nudging unrelated hex values." },
      { title: "Review interaction states", body: "Inspect hover, focus, selected, disabled, warning, and error states as carefully as the default surface." },
      { title: "Use composition safe zones", body: "Mark navigation, task, and dialog coverage before generating art, then keep the focal subject outside those zones." },
      { title: "Export reviewable variants", body: "Show light or dark alternatives and multiple ratios side by side so stakeholders compare behavior, not isolated beauty shots." },
    ],
    bestFor: ["Design engineers and product designers who live in Codex", "Studios presenting polished technical workflows", "Teams that can review color, composition, and accessibility"],
    watchFor: ["Optimizing only the empty hero view", "Subtle states that look elegant but fail interaction", "Generated typography or fake UI embedded in artwork"],
    themeSlugs: ["rose-quartz", "solar-paper"],
    faq: [
      { question: "What should a designer provide for a custom Codex theme?", answer: "Provide palette references, exact brand values when relevant, approved logos, visual likes and dislikes, room-light preference, display ratios, and any licensed source imagery." },
      { question: "Can Codex theme typography be customized?", answer: "Do not assume font replacement is part of a supported theme pack. Focus the shared design on color, surfaces, composition, and optional background behavior unless a documented platform capability says otherwise." },
      { question: "How many previews should a designer review?", answer: "At minimum review home, a dense task, code or output, a dialog, and a narrow window. Check 16:10, 16:9, and 4:3 crops when artwork is included." },
    ],
    related: [{ cluster: "styles", slug: "pastel" }, { cluster: "styles", slug: "editorial" }, { cluster: "platforms", slug: "appearance-settings" }, { cluster: "useCases", slug: "brands" }],
    keywords: ["Codex themes for designers", "designer Codex theme", "Codex UI customization", "design system developer theme"],
  },
  {
    cluster: "useCases",
    slug: "teams",
    label: "Teams",
    eyebrow: "Codex themes for teams",
    title: "A shared Codex theme without a one-size-fits-all rule.",
    metaTitle: "Codex Themes for Teams",
    metaDescription: "Create a shared Codex theme baseline for teams with cross-platform assets, light and dark variants, documented ownership, and reversible setup.",
    intro: "A team theme is most useful as a common starting point, not a visual mandate. Shared colors and artwork can make workshops and recordings coherent while individual light, dark, and reduced-art variants preserve comfort and accessibility.",
    perspective: [
      "Package the theme like an internal product. Record the owner, version, asset rights, supported platforms, approved source files, and restoration steps so the experience does not depend on the person who first assembled it.",
      "Adoption improves when people can choose intensity. A full branded background, a restrained token-only variant, and two luminance modes let each teammate keep the shared identity without sacrificing a usable workspace.",
    ],
    guidanceTitle: "Make a theme maintainable by more than one person",
    guidance: [
      { title: "Version the pack", body: "Use a clear manifest and release notes so teammates can identify which assets and behavior are active." },
      { title: "Provide intensity choices", body: "Ship full-art and reduced-art variants plus appropriate light and dark modes instead of enforcing one treatment." },
      { title: "Document asset ownership", body: "Record the source and license of logos and imagery so future updates do not introduce legal uncertainty." },
      { title: "Test both platforms", body: "Keep the pack contract shared but verify platform-specific start and restore scripts on macOS and Windows." },
    ],
    bestFor: ["Developer relations, workshops, and internal demos", "Teams that share a mature brand system", "Organizations willing to own versioning and support"],
    watchFor: ["Mandatory visual intensity for every teammate", "An unowned pack that cannot be updated", "Platform instructions tested on only one operating system"],
    themeSlugs: ["cloud-atelier", "midnight-grid"],
    faq: [
      { question: "Should a team require everyone to use the same theme?", answer: "Usually no. Standardize the pack and brand baseline, then offer light, dark, and reduced-art options. Accessibility and room conditions should take precedence over visual uniformity." },
      { question: "How should a team distribute a Codex theme?", answer: "Distribute a versioned theme-only ZIP with its manifest, checksums, assets, source, and license notes through a trusted Registry. Use the fixed-version CLI for installation and restoration." },
      { question: "Who should maintain a team theme?", answer: "Assign an explicit owner in design systems, developer experience, or developer relations, with a technical reviewer for the compatibility runtime and a brand reviewer for assets." },
    ],
    related: [{ cluster: "styles", slug: "minimal" }, { cluster: "styles", slug: "light" }, { cluster: "platforms", slug: "reversible-themes" }, { cluster: "useCases", slug: "startups" }],
    keywords: ["Codex theme for teams", "shared Codex theme", "company developer theme", "team Codex customization"],
  },
  {
    cluster: "useCases",
    slug: "ai-builders",
    label: "AI builders",
    eyebrow: "Codex themes for AI builders",
    title: "A Codex theme for the AI-native build loop.",
    metaTitle: "Codex Themes for AI Builders",
    metaDescription: "Choose a Codex theme for AI builders with clear task states, scan-friendly output, multi-window consistency, and restrained technical atmosphere.",
    intro: "AI-native building involves rapid context changes: prompting, reading plans, reviewing code, scanning tool output, and moving between tasks. A useful theme reinforces those transitions without inventing a futuristic dashboard that competes with the actual product state.",
    perspective: [
      "Prioritize scan paths. Task status, selected items, tool results, and code blocks need distinct surfaces and a consistent accent logic because the operator is repeatedly deciding where attention belongs next.",
      "Technical atmosphere can still create identity. Grids, orbital forms, soft data-like light, or restrained glass work when they remain abstract, avoid fake interface text, and yield the center of the workspace to real information.",
    ],
    guidanceTitle: "Support rapid context shifts",
    guidance: [
      { title: "Separate task and output surfaces", body: "Use reliable luminance or border differences so instructions, tool activity, and results can be scanned without rereading." },
      { title: "Keep the accent semantic", body: "Assign the strongest color to focus and current state instead of using it as decoration across every panel." },
      { title: "Avoid fake data UI", body: "Generated charts, labels, and terminal fragments create noise and can be mistaken for actual workspace information." },
      { title: "Check multiple windows", body: "AI workflows often span a laptop and external display; verify that the same theme remains clear across both." },
    ],
    bestFor: ["Agentic coding, prototyping, and rapid review loops", "Builders switching frequently between task states", "Technical demos that need a contemporary but credible look"],
    watchFor: ["Decorative interface fragments mistaken for real output", "One accent applied to unrelated task states", "Dense grids that create moiré on video"],
    themeSlugs: ["midnight-grid", "aurora-glass"],
    faq: [
      { question: "What makes a Codex theme useful for AI builders?", answer: "Clear task hierarchy, scan-friendly output, stable selected states, and low-detail artwork help users move between prompting, reviewing, and acting without extra visual interpretation." },
      { question: "Should an AI-themed background include code or data?", answer: "Avoid generated code, labels, and fake dashboards. Abstract grids, light fields, and geometry suggest a technical mood without competing with real output." },
      { question: "Can an AI builder theme work on a laptop and external display?", answer: "Yes when the pack includes multiple aspect-ratio crops and the palette is tested on both displays. A multi-monitor preview should check focal placement and contrast, not only resolution." },
    ],
    related: [{ cluster: "styles", slug: "glass" }, { cluster: "styles", slug: "dark" }, { cluster: "platforms", slug: "multi-monitor" }, { cluster: "useCases", slug: "developers" }],
    keywords: ["Codex theme for AI builders", "AI coding theme", "agentic coding workspace", "Codex AI developer theme"],
  },
];

const platformPages: SeoLanding[] = [
  {
    cluster: "platforms",
    slug: "macos",
    label: "macOS",
    eyebrow: "Codex themes on macOS",
    title: "Codex themes on macOS, with a clear way back.",
    metaTitle: "Codex Themes for macOS",
    metaDescription: "Set up a Codex theme on macOS with platform-specific scripts, validated local assets, responsive desktop crops, and documented restoration.",
    intro: "A macOS theme pack should feel native to operate even when its advanced background is not a native Codex setting. That means readable scripts, local-only files, explicit prerequisites, and a restoration path that does not modify the signed application bundle.",
    perspective: [
      "Keep the delivery boundary visible. Native light, dark, and accent choices belong to Codex appearance behavior; custom background art is supplied by an optional unofficial loopback-only compatibility layer and will not become a new Appearance menu item.",
      "Design for the displays Mac users actually move between: a 16:10 laptop, a 16:9 external monitor, and compact side-by-side windows. A 3200 × 2000 source with dedicated crops is more dependable than one image stretched into every shape.",
    ],
    guidanceTitle: "Package for a predictable macOS setup",
    guidance: [
      { title: "Do not patch the app bundle", body: "Keep artwork and runtime files outside the signed Codex application so updates and code signing remain untouched." },
      { title: "Explain script behavior", body: "Document what the start, validation, status, and restore scripts do before asking a user to run them." },
      { title: "Cover laptop ratios", body: "Treat 16:10 as the primary Mac laptop crop, then include 16:9 and 4:3 alternatives for other window shapes." },
      { title: "Test after Codex updates", body: "An unofficial compatibility path may need revalidation when the desktop app changes; version the pack and publish known constraints." },
    ],
    bestFor: ["MacBook users who want a landscape workspace background", "Creators moving between laptop and external display", "Users comfortable with an explicit local compatibility step"],
    watchFor: ["Instructions that imply the background is a native setting", "Editing the signed application bundle", "A single crop approved only on an external monitor"],
    themeSlugs: ["aurora-glass", "obsidian-orbit"],
    faq: [
      { question: "Can I install a custom Codex theme on macOS?", answer: "You can use validated theme assets and native appearance choices. Advanced artwork requires the optional unofficial local compatibility layer and should remain outside the signed app bundle." },
      { question: "Will the theme survive a Codex update?", answer: "Theme assets remain available, but unofficial runtime compatibility should be rechecked after desktop updates. A versioned pack and a tested restore path reduce uncertainty." },
      { question: "What background size suits a MacBook?", answer: "Start with 3200 × 2000 at 16:10, keeping important detail in an outer safe region. Also export 16:9 and 4:3 crops for external and compact window states." },
    ],
    related: [{ cluster: "platforms", slug: "desktop" }, { cluster: "platforms", slug: "reversible-themes" }, { cluster: "styles", slug: "glass" }, { cluster: "useCases", slug: "developers" }],
    keywords: ["Codex themes macOS", "Codex theme Mac", "customize Codex macOS", "Codex desktop background Mac"],
  },
  {
    cluster: "platforms",
    slug: "windows",
    label: "Windows",
    eyebrow: "Codex themes on Windows",
    title: "Codex themes for Windows desktop setups.",
    metaTitle: "Codex Themes for Windows",
    metaDescription: "Plan a Codex theme for Windows with PowerShell-friendly delivery, 16:9 artwork, local validation, and a reversible unofficial background option.",
    intro: "Windows setups vary from a single 16:9 laptop to multi-monitor workstations with different scaling levels. A useful pack makes those differences explicit and supplies Windows-specific commands instead of treating a macOS shell script as universal documentation.",
    perspective: [
      "The visual contract can remain cross-platform—manifest, tokens, artwork, licenses, and checksums—while launch and restore behavior is platform-specific. The fixed-version CLI owns those platform operations.",
      "Use 16:9 as an important preview, but do not stop there. Snapped windows, portrait side monitors, and mixed scaling can expose the 4:3 or compact crop more often than the full wallpaper-like scene.",
    ],
    guidanceTitle: "Deliver a Windows-native handoff",
    guidance: [
      { title: "Ship Windows commands", body: "Provide readable PowerShell start, status, validation, and restore paths rather than asking users to translate Unix instructions." },
      { title: "Account for display scaling", body: "Check interface clarity at common Windows scaling levels and avoid relying on one-pixel decorative detail." },
      { title: "Prioritize a 16:9 crop", body: "Create a dedicated wide asset while retaining 16:10 and compact alternatives for snapped and narrow-window layouts." },
      { title: "Keep networking loopback-only", body: "The optional compatibility runtime should bind locally, avoid remote commands, and document exactly which files it can read." },
    ],
    bestFor: ["16:9 laptops and desktop monitors", "Multi-monitor Windows development workstations", "Teams that need explicit PowerShell-based setup"],
    watchFor: ["Mac-only commands in the delivery", "Fine detail lost at non-default scaling", "Assuming every window stays full screen"],
    themeSlugs: ["midnight-grid", "signal-drive"],
    faq: [
      { question: "Are Codex theme packs different on Windows?", answer: "The manifest, images, visual tokens, and license records can be shared. Windows still needs platform-specific start, validation, status, and restore instructions." },
      { question: "What ratio should a Windows background use?", answer: "Prepare a dedicated 16:9 crop for common monitors, plus 16:10 and 4:3 or compact crops for laptops and snapped windows. Begin from a larger 3200 × 2000 source when possible." },
      { question: "Does a custom background appear in Windows Codex settings?", answer: "No. Native appearance options may appear there, while custom artwork uses an optional unofficial local compatibility layer and remains outside the native theme list." },
    ],
    related: [{ cluster: "platforms", slug: "multi-monitor" }, { cluster: "platforms", slug: "widescreen" }, { cluster: "styles", slug: "cyberpunk" }, { cluster: "useCases", slug: "teams" }],
    keywords: ["Codex themes Windows", "Codex theme Windows desktop", "custom Codex Windows", "Codex background Windows"],
  },
  {
    cluster: "platforms",
    slug: "desktop",
    label: "Desktop",
    eyebrow: "Codex desktop themes",
    title: "Design a Codex desktop theme for real window shapes.",
    metaTitle: "Codex Desktop Theme Guide",
    metaDescription: "Design a Codex desktop theme for 16:10, 16:9, and compact windows with safe focal placement, responsive crops, and honest setup boundaries.",
    intro: "A desktop theme is not a wallpaper pasted under an interface. Navigation, task surfaces, dialogs, side-by-side windows, and display changes cover different parts of the composition, so the pack needs several intentional assets and a stable contrast strategy.",
    perspective: [
      "Begin with a landscape master at 3200 × 2000 and define a protected reading field before placing the subject. From there, art-direct 16:10, 16:9, and 4:3 crops instead of relying on a center crop to make every decision.",
      "CSS can size an image with cover-like behavior, but it cannot recover a subject that was composed in the wrong place. Responsive rules help after art direction; they do not replace source-image planning.",
    ],
    guidanceTitle: "Treat cropping as part of the theme",
    guidance: [
      { title: "Start landscape and large", body: "Use a 3200 × 2000 source so the delivery can create multiple high-quality desktop crops." },
      { title: "Mark interface coverage", body: "Reserve the left navigation and central task region before placing faces, products, logos, or bright focal objects." },
      { title: "Export three ratios", body: "Deliver dedicated 16:10, 16:9, and 4:3 assets plus a lightweight preview rather than one universal image." },
      { title: "Inspect dialogs and empty states", body: "A background behaves differently when exposed on home and partially hidden by a modal, task, or code block." },
    ],
    bestFor: ["Anyone generating a new landscape Codex background", "Laptop-to-monitor workflows", "Themes with a recognizable subject, logo, or light source"],
    watchFor: ["Portrait images stretched into landscape", "Important subjects placed dead center", "Assuming CSS cover preserves every composition"],
    themeSlugs: ["cloud-atelier", "sage-workshop"],
    faq: [
      { question: "Can CSS automatically fit any image to Codex Desktop?", answer: "CSS can scale and crop an image, but it cannot guarantee that a face, logo, or focal object remains visible. Dedicated crops and safe-zone composition still produce the best result." },
      { question: "Can I upload a portrait image for a Codex theme?", answer: "It can be cropped, but a portrait source often loses its subject or leaves insufficient landscape context. Generate or provide a 16:10 landscape source whenever possible." },
      { question: "Why use 3200 × 2000?", answer: "It provides a high-resolution 16:10 master with enough room to derive 16:9 and 4:3 crops for common desktop and compact layouts." },
    ],
    related: [{ cluster: "platforms", slug: "widescreen" }, { cluster: "platforms", slug: "background-image" }, { cluster: "styles", slug: "cozy" }, { cluster: "useCases", slug: "designers" }],
    keywords: ["Codex desktop theme", "Codex desktop background", "Codex theme image size", "customize Codex desktop"],
  },
  {
    cluster: "platforms",
    slug: "background-image",
    label: "Background image",
    eyebrow: "Codex background images",
    title: "Create a Codex background image that fits the interface.",
    metaTitle: "Codex Background Image Guide",
    metaDescription: "Create a Codex background image with a 3200 × 2000 landscape source, safe reading fields, responsive crops, asset rights, and local delivery.",
    intro: "The best Codex background is designed around what will cover it. It offers a calm field under navigation and task surfaces, places the meaningful subject toward a safe outer region, and includes enough visual context to survive three desktop ratios.",
    perspective: [
      "Prompt guidance should describe composition as carefully as style: 16:10 landscape, 3200 × 2000, no text, no fake interface, a quiet center-left reading field, and important detail in the outer third. This prevents most expensive crop failures before upload.",
      "After generation, the system should validate format and dimensions, show multiple previews, and create explicit derivative assets. The original should remain traceable, with user-confirmed rights and a retention policy that is easy to understand.",
    ],
    guidanceTitle: "Generate for the workspace, not the gallery",
    guidance: [
      { title: "Prompt the safe zone", body: "Ask for a quiet center-left field and place the focal subject or strongest light in the outer third." },
      { title: "Ban generated text", body: "Specify no words, letters, logos, watermarks, code, or fake UI; add approved marks later as separate assets." },
      { title: "Validate before packaging", body: "Check file type, dimensions, orientation, and crop quality before generating the final pack." },
      { title: "Record usage rights", body: "Require confirmation that the user owns or may use the uploaded image and preserve that record with the delivery." },
    ],
    bestFor: ["Custom themes generated from a written visual brief", "Brand atmospheres with separately supplied logos", "Landscape illustrations with broad negative space"],
    watchFor: ["Portrait sources and central faces", "Generated text, watermarks, or interface fragments", "Uploads without known usage rights"],
    themeSlugs: ["aurora-glass", "rose-quartz"],
    faq: [
      { question: "What prompt should I use for a Codex background?", answer: "Specify a 3200 × 2000, 16:10 landscape composition with a quiet center-left reading field, focal interest in the outer third, broad shapes, no text, no logos, no watermark, and no fake interface." },
      { question: "Can the website crop my image automatically?", answer: "It can create useful 16:10, 16:9, and 4:3 derivatives, but you should preview each one. Automatic cropping cannot invent missing context or rescue a poorly placed subject." },
      { question: "Does Codex natively support custom background images?", answer: "Do not treat advanced backgrounds as a native Appearance feature. They use the optional unofficial local compatibility layer and remain separate from Codex's built-in settings." },
    ],
    related: [{ cluster: "platforms", slug: "desktop" }, { cluster: "platforms", slug: "appearance-settings" }, { cluster: "styles", slug: "glass" }, { cluster: "useCases", slug: "brands" }],
    keywords: ["Codex background image", "custom Codex background", "Codex background prompt", "Codex theme image generator"],
  },
  {
    cluster: "platforms",
    slug: "appearance-settings",
    label: "Appearance settings",
    eyebrow: "Codex appearance settings",
    title: "Know what belongs in Codex Appearance settings.",
    metaTitle: "Codex Appearance Settings and Themes",
    metaDescription: "Understand the boundary between native Codex appearance settings, validated theme assets, and the optional unofficial custom background layer.",
    intro: "Theme language can hide an important distinction. Native choices that Codex exposes in Appearance are different from a downloadable pack's visual tokens, and both are different from an advanced background supplied by an unofficial local compatibility layer.",
    perspective: [
      "A custom pack should never imply that it registers a new named theme inside Settings > Appearance unless the product actually supports that behavior. Describe exactly which values are native, which belong to the pack, and which require the local runtime.",
      "This boundary improves support. Users know where to change a native mode, where to replace an asset, and how to stop the optional layer without searching for a setting that does not exist.",
    ],
    guidanceTitle: "Label every customization layer",
    guidance: [
      { title: "Call native settings native", body: "Use Codex's built-in appearance controls where available and do not rename them as a custom installed theme." },
      { title: "Describe pack assets", body: "Explain the manifest, tokens, images, licenses, and checksums that make the theme pack inspectable." },
      { title: "Name unofficial behavior", body: "State plainly that advanced artwork depends on an optional loopback-only local compatibility layer." },
      { title: "Show the restore path", body: "Tell users how to stop the optional layer and return to native appearance beside the activation steps." },
    ],
    bestFor: ["Users deciding whether custom artwork fits their risk tolerance", "Support teams documenting what a pack changes", "Theme authors writing honest installation instructions"],
    watchFor: ["Claiming a custom pack appears in the native theme list", "Blurring native and unofficial controls", "Hiding the restore instructions after installation"],
    themeSlugs: ["cloud-atelier", "obsidian-orbit"],
    faq: [
      { question: "Will a downloaded theme appear in Settings > Appearance?", answer: "No. Native appearance options may appear there, but a downloaded pack does not become a new named option. Advanced artwork is handled by the optional unofficial local compatibility layer." },
      { question: "What parts of a theme are shared across platforms?", answer: "A manifest, visual tokens, responsive artwork, preview images, checksums, and asset source notes can be packaged and moved between supported setups." },
      { question: "Can I use only the native appearance options?", answer: "Yes. You can ignore or restore the optional artwork layer and continue with Codex's native appearance choices. The delivery should make that boundary and path explicit." },
    ],
    related: [{ cluster: "platforms", slug: "background-image" }, { cluster: "platforms", slug: "reversible-themes" }, { cluster: "styles", slug: "light" }, { cluster: "useCases", slug: "designers" }],
    keywords: ["Codex appearance settings", "Codex custom theme settings", "Codex theme support", "Codex Appearance theme"],
  },
  {
    cluster: "platforms",
    slug: "widescreen",
    label: "Widescreen",
    eyebrow: "Codex themes for widescreen",
    title: "A widescreen Codex theme that uses the extra room.",
    metaTitle: "Widescreen Codex Theme Guide",
    metaDescription: "Design a widescreen Codex theme with edge-weighted artwork, 16:9 and ultrawide-safe composition, protected work surfaces, and compact fallbacks.",
    intro: "Wide displays create space for atmosphere, but they also tempt theme authors to place important content at both extremes. The Codex window may not remain full screen, so a durable composition feels complete at full width and still works when only its central or compact crop is visible.",
    perspective: [
      "Use the far edge for optional scenery, not required meaning. A horizon, gradient, or architectural shape can extend naturally, while a face, wordmark, or product should sit inside a defined safe region with sufficient breathing room.",
      "Preview more than 16:9. Ultrawide users often center the app or snap it beside a browser, which can make the effective window closer to 4:3. The theme should simplify gracefully rather than squeezing every decorative element into the reduced view.",
    ],
    guidanceTitle: "Compose wide, then prove it compact",
    guidance: [
      { title: "Make the outer edge optional", body: "Let the scenery expand into extra width without placing critical brand or subject information at the extreme boundary." },
      { title: "Protect the central work zone", body: "Use broad low-detail color behind the task and code surfaces so full-screen width does not increase distraction." },
      { title: "Create a compact fallback", body: "Export a deliberate 4:3 crop that removes secondary scenery instead of shrinking or distorting it." },
      { title: "Test snapped windows", body: "Review half-screen and centered-window states on the target monitor, not only a browser mockup at full width." },
    ],
    bestFor: ["16:9, 21:9, and large external displays", "Streaming or demo scenes with lateral breathing room", "Landscape artwork with an edge-weighted horizon"],
    watchFor: ["Logos placed at the extreme edge", "A composition that collapses when the window is snapped", "Detailed scenery spanning the entire reading field"],
    themeSlugs: ["signal-drive", "obsidian-orbit"],
    faq: [
      { question: "Do I need an ultrawide-specific Codex image?", answer: "A dedicated wide crop can improve full-screen composition, but keep a 16:9 and compact fallback because the Codex window may be centered or snapped rather than stretched across the monitor." },
      { question: "Where should the subject go on a widescreen background?", answer: "Place it in an outer third but inside a safe margin. The farthest edge should contain expendable atmosphere so different monitors and window widths do not cut off meaning." },
      { question: "Will one 16:9 image work on every wide display?", answer: "It may cover the space, but visual quality depends on focal placement and cropping. Purpose-made wide and compact derivatives give more predictable results." },
    ],
    related: [{ cluster: "platforms", slug: "desktop" }, { cluster: "platforms", slug: "multi-monitor" }, { cluster: "styles", slug: "space" }, { cluster: "useCases", slug: "streamers" }],
    keywords: ["widescreen Codex theme", "ultrawide Codex background", "16:9 Codex theme", "Codex theme wide monitor"],
  },
  {
    cluster: "platforms",
    slug: "multi-monitor",
    label: "Multi-monitor",
    eyebrow: "Codex themes for multiple monitors",
    title: "Keep a Codex theme consistent across multiple displays.",
    metaTitle: "Multi-Monitor Codex Theme Guide",
    metaDescription: "Plan a multi-monitor Codex theme for mixed ratios, scaling, luminance, and window positions with responsive assets and restrained focal placement.",
    intro: "Two displays rarely reproduce a theme identically. They may differ in ratio, density, scaling, black level, color, and room position, so multi-monitor quality comes from resilient contrast and alternate crops rather than one perfectly tuned screenshot.",
    perspective: [
      "Choose the display roles first. A laptop may hold communication while Codex occupies a wide external display, or Codex may move between them throughout the day. Test the actual transitions and saved window sizes that matter to the user.",
      "Do not use a narrow contrast margin. A translucent panel that barely works on one calibrated screen may disappear on a brighter or lower-quality display. Slightly more stable surfaces usually preserve the visual idea better across hardware.",
    ],
    guidanceTitle: "Design for differences you cannot calibrate away",
    guidance: [
      { title: "List each target display", body: "Record ratio, effective resolution, scaling, and whether Codex normally runs full screen, centered, or snapped." },
      { title: "Strengthen surface separation", body: "Give panels enough opacity and border contrast to survive changes in black level and viewing angle." },
      { title: "Use alternate focal crops", body: "A subject placed for the laptop may need a different crop on a wide monitor; do not merely resize the same file." },
      { title: "Review handoff states", body: "Move the window between displays and check active controls, dialogs, code, and background placement after scaling changes." },
    ],
    bestFor: ["Laptop plus external monitor workflows", "Teams using mixed display hardware", "Creators who build on one display and present on another"],
    watchFor: ["Transparency tuned to one premium display", "Window scaling that changes effective crop", "A focal subject visible on only one monitor"],
    themeSlugs: ["midnight-grid", "cloud-atelier"],
    faq: [
      { question: "Why does my Codex theme look different on another monitor?", answer: "Displays differ in brightness, black level, color, scaling, and ratio. Use stable panel contrast and dedicated crops, then review the actual displays instead of relying on a single color-managed mockup." },
      { question: "Should both monitors use the same background crop?", answer: "Not always. Use a shared visual family with ratio-appropriate crops so the focal subject and quiet reading field remain correctly positioned on each display." },
      { question: "How do I test a multi-monitor Codex theme?", answer: "Move realistic home, task, code, and dialog states between displays at normal window sizes. Check scaling transitions, focal placement, muted text, borders, and glare in the room." },
    ],
    related: [{ cluster: "platforms", slug: "widescreen" }, { cluster: "platforms", slug: "windows" }, { cluster: "styles", slug: "minimal" }, { cluster: "useCases", slug: "ai-builders" }],
    keywords: ["multi monitor Codex theme", "Codex theme multiple displays", "Codex desktop multi monitor", "responsive Codex background"],
  },
  {
    cluster: "platforms",
    slug: "low-distraction",
    label: "Low distraction",
    eyebrow: "Low-distraction Codex setup",
    title: "Reduce visual distraction without losing useful hierarchy.",
    metaTitle: "Low-Distraction Codex Theme Guide",
    metaDescription: "Build a low-distraction Codex theme with predictable emphasis, quiet artwork, legible muted states, and practical day and night variants.",
    intro: "Low distraction is not the absence of color. It is a controlled attention model in which the current task, focus state, and important status are clear while background atmosphere, inactive controls, and decorative borders remain subordinate.",
    perspective: [
      "Audit frequency as well as intensity. A single bright accent can be calm, while dozens of subtle glowing borders still create constant visual activity. Reduce the number of emphasized objects before making every color dimmer.",
      "Muted does not mean inaccessible. Secondary text, inactive tabs, panel edges, and disabled states still need to communicate their role. A low-distraction theme should reduce unnecessary signals without concealing necessary ones.",
    ],
    guidanceTitle: "Remove false focal points",
    guidance: [
      { title: "Count emphasized elements", body: "Reserve high contrast for the active task, keyboard focus, and important status rather than outlining every surface." },
      { title: "Use quiet source art", body: "Choose broad gradients or one distant form and remove small high-contrast detail from the reading field." },
      { title: "Keep muted text legible", body: "Review secondary labels and inactive states in normal room light instead of lowering contrast by feel." },
      { title: "Create room-light variants", body: "Pair a dim-room version with a brighter daytime option while preserving the same attention hierarchy." },
    ],
    bestFor: ["Long coding, reading, and task-management sessions", "Compact windows and split-screen work", "Users who want personality without continuous spectacle"],
    watchFor: ["Hiding inactive or secondary controls", "Making all panels the same tone", "Confusing low luminance with low distraction"],
    themeSlugs: ["obsidian-orbit", "sage-workshop"],
    faq: [
      { question: "What is a low-distraction Codex theme?", answer: "It uses predictable emphasis: strong contrast for active work and important state, stable surfaces for reading, and quiet decoration around the edges. It can be light or dark." },
      { question: "Should I turn off background art for focus?", answer: "Only if it competes with the task. Broad, edge-weighted art can make the workspace pleasant while remaining subordinate; detailed or high-contrast imagery is more likely to distract." },
      { question: "How is low distraction different from minimal style?", answer: "Minimal describes a visual language with restrained elements. Low distraction describes the attention outcome. A cozy, editorial, or space theme can also be low distraction when its hierarchy is controlled." },
    ],
    related: [{ cluster: "styles", slug: "minimal" }, { cluster: "styles", slug: "dark" }, { cluster: "useCases", slug: "deep-focus" }, { cluster: "platforms", slug: "appearance-settings" }],
    keywords: ["low distraction Codex theme", "distraction free Codex", "focus Codex settings", "calm Codex background"],
  },
  {
    cluster: "platforms",
    slug: "reversible-themes",
    label: "Reversible themes",
    eyebrow: "Reversible Codex themes",
    title: "Choose a Codex theme with restoration built in.",
    metaTitle: "Reversible Codex Themes and Restore",
    metaDescription: "Understand reversible Codex theme delivery with local assets, validation, no signed-app modification, explicit status, and a tested restore path.",
    intro: "Customization is easier to trust when the return path is designed at the same time as activation. A reversible pack keeps its files separate from the signed application, exposes what is active, and offers a clear command to stop the optional layer and return to native Codex.",
    perspective: [
      "Restoration should not depend on remembering which files were manually edited. The delivery should use an explicit active-pack pointer or equivalent local state, validate it before launch, and remove or disable that state predictably during restore.",
      "Security boundaries belong in the user-facing explanation. A local compatibility runtime should bind only to loopback, avoid chat and credential access, reject remote commands, and limit file reads to the active pack contract.",
    ],
    guidanceTitle: "Make restore as visible as install",
    guidance: [
      { title: "Keep the app untouched", body: "Store pack assets and runtime state outside the signed Codex bundle rather than patching distributed application files." },
      { title: "Validate before start", body: "Check the manifest, required assets, dimensions, checksums, and active-pack reference before activating anything." },
      { title: "Expose status", body: "Give users a simple way to see whether the optional local layer is running and which pack is active." },
      { title: "Test the clean return", body: "Stop the runtime, clear the active state, reopen Codex, and verify native appearance before calling the delivery complete." },
    ],
    bestFor: ["Users evaluating unofficial background behavior cautiously", "Teams that require supportable local customization", "Theme authors building trust through transparent delivery"],
    watchFor: ["Manual edits without an inventory", "A restore command documented but never tested", "Local services exposed beyond loopback"],
    themeSlugs: ["obsidian-orbit", "cloud-atelier"],
    faq: [
      { question: "What makes a Codex theme reversible?", answer: "Its assets stay outside the signed app, active state is explicit, setup is validated, and a tested restore path stops the optional runtime and returns Codex to native appearance." },
      { question: "Does restore delete my downloaded theme pack?", answer: "It does not have to. Restore can deactivate the optional layer while keeping the pack available for inspection or later reuse. The instructions should state exactly what is retained." },
      { question: "Is a reversible theme officially supported by Codex?", answer: "Native appearance options are distinct from advanced artwork. The background compatibility layer is unofficial even when it is local and reversible, so the pack should describe that limitation plainly." },
    ],
    related: [{ cluster: "platforms", slug: "appearance-settings" }, { cluster: "platforms", slug: "macos" }, { cluster: "styles", slug: "minimal" }, { cluster: "useCases", slug: "teams" }],
    keywords: ["reversible Codex theme", "restore Codex theme", "safe Codex customization", "Codex theme uninstall"],
  },
];

export const seoPages: SeoLanding[] = [...stylePages, ...useCasePages, ...platformPages];

export function getSeoPagesByCluster(cluster: SeoClusterKey) {
  return seoPages.filter((page) => page.cluster === cluster);
}

export function getSeoPage(cluster: SeoClusterKey, slug: string) {
  return seoPages.find((page) => page.cluster === cluster && page.slug === slug);
}

export function seoLandingPath(page: Pick<SeoLanding, "cluster" | "slug">) {
  return `${seoClusters[page.cluster].path}/${page.slug}`;
}

export function getRelatedSeoPages(page: SeoLanding) {
  return page.related
    .map((item) => getSeoPage(item.cluster, item.slug))
    .filter((item): item is SeoLanding => Boolean(item));
}

const socialImage = {
  url: absoluteUrl("/og.png"),
  width: 1200,
  height: 630,
  alt: "Get Codex Theme — custom Codex Desktop theme packs",
};

export function createSeoPageMetadata(page: SeoLanding): Metadata {
  const url = absoluteUrl(seoLandingPath(page));
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: page.metaTitle,
      description: page.metaDescription,
      siteName: "Get Codex Theme",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
      images: [socialImage.url],
    },
  };
}

export function createSeoHubMetadata(cluster: SeoCluster): Metadata {
  const url = absoluteUrl(cluster.path);
  return {
    title: cluster.metaTitle,
    description: cluster.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: cluster.metaTitle,
      description: cluster.metaDescription,
      siteName: "Get Codex Theme",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: cluster.metaTitle,
      description: cluster.metaDescription,
      images: [socialImage.url],
    },
  };
}
