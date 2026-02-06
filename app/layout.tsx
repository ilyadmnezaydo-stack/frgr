import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Smart CRM Importer - AI-Powered Excel Import",
    description: "Import Excel files into your CRM with intelligent AI column mapping using local Ollama models",
    keywords: ["CRM", "Excel", "Import", "AI", "Ollama", "Supabase"],
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mybotoai.ru"),
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.variable}>
                <AppProviders>
                    {children}
                </AppProviders>
            </body>
        </html>
    );
}
