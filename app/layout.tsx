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
      <body className="bg-white text-[#171717] antialiased min-h-screen m-0">
        <AuthProvider>
          <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6">
            <main className="w-full max-w-xl mx-auto flex flex-col items-center justify-center">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}