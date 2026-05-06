import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Novatio - Architecture & Interior Design",
  description:
    "We craft architectural designs that blend creativity, functionality, and innovation to shape modern, timeless spaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
