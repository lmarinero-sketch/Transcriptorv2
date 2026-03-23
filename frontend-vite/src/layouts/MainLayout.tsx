import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "Sanatorio Argentino — Transcriptor IA",
  description: "Trascendencia tecnológica del Sanatorio Argentino mediante inteligencia artificial.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  metadataBase: new URL(import.meta.env.VITE_SITE_URL || "https://transcriptor-sanatorio.vercel.app"),
  openGraph: {
    title: "Sanatorio Argentino — Transcriptor IA",
    description: "Trascendencia tecnológica del Sanatorio Argentino mediante inteligencia artificial.",
    siteName: "Sanatorio Argentino",
    type: "website",
  },
  other: {
    "theme-color": "#00548B",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

