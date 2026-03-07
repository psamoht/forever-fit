import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";
import { CoachFAB } from "@/components/coach-fab";
import { ThemeProvider } from "@/components/theme-provider";
import { ProfileProvider } from "@/components/profile-provider";
import { TelemetryProvider } from "@/components/telemetry-provider";
import { HeatmapOverlay } from "@/components/heatmap-overlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forever Fit - Dein Fitness Coach",
  description: "Einfaches Fitness-Training für jedes Alter.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ProfileProvider>
            <TelemetryProvider>
              <Navbar />
              <main className="mx-auto max-w-lg p-6 pb-24">
                {children}
              </main>
              <CoachFAB />
              <HeatmapOverlay />
            </TelemetryProvider>
            <Toaster position="top-center" richColors />
          </ProfileProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
