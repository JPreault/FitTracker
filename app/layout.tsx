import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/toggle-mode";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const title = "Fit Tracker";
const description = "Tracker vos forme est un jeu d'enfant";
const url = "https://fit-tracker-mauve.vercel.app";

export const metadata: Metadata = {
    metadataBase: new URL(url),
    title: {
        default: title,
        template: `%s - ${title}`,
    },
    description: description,
    applicationName: title,
    authors: [
        {
            url: "https://www.alexandre-artisien.fr",
            name: "Alexandre Artisien",
        },
    ],
    generator: "Next.js",
    creator: "Alexandre Artisien",
    publisher: "Alexandre Artisien",
    appleWebApp: {
        capable: true,
        title: title,
        statusBarStyle: "default",
    },
    openGraph: {
        title: {
            default: title,
            template: `%s`,
        },
        description: description,
        url: url,
        siteName: title,
        locale: "fr_FR",
        type: "website",
        images: "banner.png",
    },
    twitter: {
        title: {
            default: title,
            template: `%s`,
        },
        description: description,
        card: "summary_large_image",
        images: "banner.png",
    },
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <SidebarProvider>
                        <AppSidebar />
                        <main className="w-full flex flex-col">
                            <div className="w-full flex justify-between items-center sticky top-0 backdrop-blur-xs p-4">
                                <SidebarTrigger />
                                <ModeToggle />
                            </div>
                            <div className="p-4">{children}</div>
                            <Toaster richColors />
                        </main>
                    </SidebarProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
