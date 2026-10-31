import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { themeScript } from "@/lib/theme/theme";
import "@/styles/theme.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArcadeLink",
  description: "Seus jogos retrô, direto do seu Google Drive.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
