import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-serif"
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "rpsyche",
  description: "A shared journal for close minds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-[#FBF9F5] text-[#1C1917] antialiased">
        <AuthProvider>
          <main className="max-w-2xl mx-auto px-4 py-8 min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}