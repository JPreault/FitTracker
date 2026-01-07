"use client";

import { Apple, CircleGauge, CircleUser, Dumbbell, Flame, Footprints, GlassWater, HeartPulse, Play, SquareActivity } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
};

const data: NavItem[] = [
    {
        title: "Steps",
        url: "/steps",
        icon: Footprints,
    },
    {
        title: "Calories",
        url: "/calories",
        icon: Flame,
    },
    {
        title: "BMI",
        url: "/bmi",
        icon: SquareActivity,
    },
    {
        title: "Macros",
        url: "/macros",
        icon: Apple,
    },
    {
        title: "Hydratation",
        url: "/hydration",
        icon: GlassWater,
    },
    {
        title: "Allure",
        url: "/allure",
        icon: CircleGauge,
    },
    {
        title: "Cardio",
        url: "/cardio",
        icon: HeartPulse,
    },
    {
        title: "Séances",
        url: "/sessions",
        icon: Dumbbell,
    },
    {
        title: "Lancer une séance",
        url: "/workout",
        icon: Play,
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <Sidebar collapsible="offcanvas" className="border-r-2 border-primary/10 bg-background/95 backdrop-blur-sm" {...props}>
            <SidebarHeader className="p-4 pb-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            size="lg"
                            className="hover:bg-transparent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Link
                                onClick={() => {
                                    if (isMobile) {
                                        setOpenMobile(false);
                                    }
                                }}
                                href="/"
                                className="flex items-center gap-3 group"
                            >
                                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary/20 group-hover:scale-105">
                                    <Flame className="size-6 fill-primary/20" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors">
                                        Fit Tracker
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">App santé</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-2">
                            {data.map((item) => {
                                const isActive = pathname === item.url || (item.url === "/workout" && pathname?.startsWith("/workout"));
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip={item.title}
                                            className={cn(
                                                "h-12 rounded-xl transition-all duration-200 hover:bg-primary/10 hover:text-primary group/item",
                                                isActive && "bg-primary/10 text-primary font-bold shadow-sm"
                                            )}
                                        >
                                            <Link
                                                href={item.url}
                                                onClick={() => {
                                                    if (isMobile) {
                                                        setOpenMobile(false);
                                                    }
                                                }}
                                                className={cn("flex gap-4 items-center px-4", item.disabled && "opacity-50 pointer-events-none")}
                                            >
                                                {item.icon && (
                                                    <item.icon
                                                        className={cn(
                                                            "size-5 text-muted-foreground transition-colors",
                                                            isActive ? "text-primary" : "group-hover/item:text-primary"
                                                        )}
                                                    />
                                                )}
                                                <span className="text-base font-medium">{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 pt-0">
                <div className="rounded-xl border-2 border-primary/5 bg-muted/30 p-1">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                className="w-full text-left h-auto py-2 px-2 hover:bg-background hover:shadow-sm transition-all rounded-lg"
                            >
                                <Link
                                    href="/profile"
                                    onClick={() => {
                                        if (isMobile) {
                                            setOpenMobile(false);
                                        }
                                    }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex items-center justify-center bg-background p-1.5 rounded-full ring-1 ring-border text-primary/80">
                                        <CircleUser className="size-4" />
                                    </div>
                                    <div className="flex flex-col items-start gap-0.5 overflow-hidden">
                                        <span className="font-bold text-sm truncate">Mon Profil</span>
                                        <span className="text-[10px] text-muted-foreground truncate">Gérer mon compte</span>
                                    </div>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
                <div className="text-xs text-center">Fit Tracker v1.0.0</div>
                <div className="text-xs text-center">
                    © {new Date().getFullYear()}{" "}
                    <Link className="text-primary hover:underline" target="_blank" rel="noopener noreferrer nofollow" href="https://www.alexandre-artisien.fr">
                        Alexanndre Artisien
                    </Link>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
