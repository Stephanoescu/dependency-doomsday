import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { defaultLocale, getMessages } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const t = getMessages();

export const metadata: Metadata = {
  title: { default: t.meta.title, template: `%s — ${t.brand.name}` },
  description: t.meta.description,
  applicationName: t.brand.name,
  metadataBase: new URL(siteUrl()),
  openGraph: {
    siteName: t.brand.name,
    title: t.meta.title,
    description: t.meta.description,
    type: "website",
  },
  // The image itself comes from app/opengraph-image.tsx (and per-page overrides).
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={defaultLocale}
      className={`${archivo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="doom-backdrop flex min-h-full flex-col bg-no-repeat">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        {/* The script only exists on Vercel; elsewhere it would just 404. */}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
