import { CircleUser, Flame, Footprints, SquareActivity } from "lucide-react";

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
import { Button } from "./button";

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
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                            <Link href="/">
                                <Flame className="!size-6" />
                                <span className="text-xl font-semibold">Fit Tracker</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent className="flex flex-col gap-2">
                        <SidebarMenu>
                            {data.navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton tooltip={item.title}>
                                        <Link className="flex w-full gap-3 items-center" href={item.url}>
                                            {item.icon && <item.icon />}
                                            {item.title}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Button asChild className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                            <Link href="/profile">
                                <CircleUser />
                                <span className="truncate font-medium">Profile</span>
                            </Link>
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
