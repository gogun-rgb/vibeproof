import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeProof",
  description: "Scan before your AI runs it."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

