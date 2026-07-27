import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Korty Kraków",
  description: "Dostępność kortów tenisowych w jednym miejscu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full min-h-svh bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
