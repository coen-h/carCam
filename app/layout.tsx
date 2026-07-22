import type { Metadata } from "next";
import type { Viewport } from 'next'
import { Rubik } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ThemeProvider } from '@/app/components/ThemeContext';
import Background from '@/app/components/Background';
import Header from '@/app/components/Header';
import "./globals.css";

const geistSans = Rubik({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// const geistMono = Rubik_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "carCam - Parking Surveillance",
  manifest: "/manifest.json",
  description: "carCam is the solution for parking surveillance",
};

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${geistSans.variable} h-full antialiased`}
      >
        <body className="w-full h-dvh flex flex-col bg-base-100 overflow-hidden text-base-content">
          <ConvexClientProvider>
            <ThemeProvider>
              <Background />
              <Header />
            
              {children}
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
