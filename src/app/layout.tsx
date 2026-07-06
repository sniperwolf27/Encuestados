import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encuestas David Fotocolor",
  description: "Encuestas de satisfacción David Fotocolor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
