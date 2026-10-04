import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n/provider";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SedimentCarbon dMRV — Carbon Credit for Sediment-Trap Agriculture",
  description:
    "Digital MRV system for sediment-trap agriculture carbon projects. Supports T-VER, VCS, Gold Standard, and ISO 14064-2.",
  keywords: [
    "dMRV",
    "Carbon Credit",
    "Soil Organic Carbon",
    "Sediment Trap",
    "T-VER",
    "VCS",
    "Gold Standard",
    "ISO 14064",
    "Thailand",
  ],
  authors: [{ name: "SedimentCarbon dMRV" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <I18nProvider>{children}</I18nProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
