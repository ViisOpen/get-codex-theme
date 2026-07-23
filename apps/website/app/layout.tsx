import type { Metadata } from "next";
import { Barlow, Instrument_Serif } from "next/font/google";
import { AuthModal } from "@/components/AuthModal";
import "./globals.css";

const bodyFont = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const headingFont = Instrument_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getcodextheme.com"),
  title: {
    default: "Get Codex Theme — Free Community Themes",
    template: "%s | Get Codex Theme",
  },
  description:
    "Browse, install, like, and publish automatically validated community themes for Codex Desktop. Downloads require no account.",
  keywords: [
    "Codex themes",
    "custom Codex theme",
    "Codex community themes",
    "Codex background",
    "customize Codex",
  ],
  icons: {
    icon: [
      { url: "/favicon-v2.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon-v2.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Get Codex Theme",
    title: "Get Codex Theme — Make Codex feel like yours",
    description:
      "Free, validated, creator-attributed themes for Codex Desktop.",
    url: "https://getcodextheme.com",
    images: [{ url: "/og-concepts.png", width: 1200, height: 630, alt: "Get Codex Theme — installable packs and clearly labeled concept directions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Get Codex Theme",
    description: "Free, validated, creator-attributed Codex themes.",
    images: ["/og-concepts.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            { "@context": "https://schema.org", "@type": "Organization", name: "Get Codex Theme", url: "https://getcodextheme.com", logo: "https://getcodextheme.com/favicon-v2.png" },
            { "@context": "https://schema.org", "@type": "WebSite", name: "Get Codex Theme", url: "https://getcodextheme.com" },
          ]) }}
        />
        <div id="main-content">{children}</div>
        <AuthModal />
      </body>
    </html>
  );
}
