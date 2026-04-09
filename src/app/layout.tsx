import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Acca – Hammarby Fotboll Press Accreditation",
  description: "Press accreditation management for Hammarby Fotboll",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="h-screen bg-[#cde0d4]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
