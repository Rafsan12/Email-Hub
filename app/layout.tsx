import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Hub | Reply Tracker & Multi-Account Dashboard",
  description: "Unified Gmail & Webmail tracking dashboard with reply detection and aesthetic dark mode",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0e17] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
