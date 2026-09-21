import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadence",
  description: "Give your week a rhythm.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
