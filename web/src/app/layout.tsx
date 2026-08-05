import type { Metadata, Viewport } from "next";
import { PortraitLock } from "@/components/PortraitLock";
import { iosSplashMetadata } from "@/lib/pwa/ios-splash";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "rally",
    template: "%s · rally",
  },
  description:
    "Coordina tenis con tu grupo: asistencias, quién paga la cancha, deudas y rankings.",
  applicationName: "rally",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "rally",
    startupImage: iosSplashMetadata(),
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-PE"
      className="h-full"
      // Inline so iOS never flashes white before CSS loads.
      style={{ backgroundColor: "#000000" }}
    >
      <body
        className="min-h-full antialiased"
        style={{ backgroundColor: "#000000" }}
      >
        <PortraitLock />
        {children}
      </body>
    </html>
  );
}
