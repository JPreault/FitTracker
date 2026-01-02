import { Apple, CircleUser, Flame, Footprints, GlassWater, SquareActivity } from "lucide-react";

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
} from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";

const data = {
    navMain: [
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
            disabled: true,
        },
        {
            title: "Hydratation",
            url: "/hydration",
            icon: GlassWater,
            disabled: true,
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                            <Link href="/" className="flex items-center gap-3 group">
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
                            {data.navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        className="h-12 rounded-xl transition-all duration-200 hover:bg-primary/10 hover:text-primary group/item"
                                    >
                                        <Link href={item.url} className={cn("flex gap-4 items-center px-4", item.disabled && "opacity-50 pointer-events-none")} >
                                            {item.icon && (
                                                <item.icon className="size-5 text-muted-foreground group-hover/item:text-primary transition-colors" />
                                            )}
                                            <span className="text-base font-medium">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
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
                                <Link href="/profile" className="flex items-center gap-3">
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
            </SidebarFooter>
        </Sidebar>
    );
}
