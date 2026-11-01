import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { defaultLocale, getMessages } from "@/lib/i18n";
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
      </body>
    </html>
  );
}
