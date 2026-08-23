import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Caveat } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
});

export const metadata: Metadata = {
  title: "rpsyche",
  description: "A private notebook shared with your circle.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${caveat.variable}`}>
      <body className="min-h-screen bg-[#FBF9F5] text-[#1C1917] font-sans antialiased">
        <AuthProvider>
          <main className="max-w-xl mx-auto px-6 py-12">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}