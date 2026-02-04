import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Smart CRM Importer - AI-Powered Excel Import",
    description: "Import Excel files into your CRM with intelligent AI column mapping using local Ollama models",
    keywords: ["CRM", "Excel", "Import", "AI", "Ollama", "Supabase"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.variable}>{children}</body>
        </html>
    );
}
