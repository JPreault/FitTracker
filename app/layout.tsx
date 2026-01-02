import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fit Tracker",
  description: "Track your fit, like a child play",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="fr">
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
              <SidebarProvider>
                  <AppSidebar />
                  <main className="w-full flex flex-col">
                      <SidebarTrigger />
                      {children}
                      <Toaster />
                  </main>
              </SidebarProvider>
          </body>
      </html>
  );
}
