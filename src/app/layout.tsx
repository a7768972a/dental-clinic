import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dental OS - نظام إدارة عيادة الأسنان",
  description: "نظام إدارة عيادة أسنان متكامل - عيادة الدكتور بشار عابدين",
  keywords: ["عيادة أسنان", "إدارة طبية", "Dental OS", "سوريا"],
  authors: [{ name: "Dental OS Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${ibmPlexArabic.variable} font-sans antialiased bg-background text-foreground`}
        style={{ fontFamily: 'var(--font-arabic), system-ui, sans-serif' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
