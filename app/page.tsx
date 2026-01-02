import { cn } from "@/lib/utils";
import { Apple, Flame, Footprints, GlassWater, SquareActivity } from "lucide-react";
import Link from "next/link";

const apps = [
    {
        title: "Steps",
        description: "Estimez votre nombre de pas en fonction de la distance parcourue.",
        url: "/steps",
        icon: Footprints,
        disabled: false,
    },
    {
        title: "Calories",
        description: "Estimation de vos besoins énergétiques quotidiens selon la formule Mifflin-St Jeor.",
        url: "/calories",
        icon: Flame,
        disabled: false,
    },
    {
        title: "BMI",
        description: "Indice de Masse Corporelle selon la classification de l'OMS.",
        url: "/bmi",
        icon: SquareActivity,
        disabled: false,
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
];

export default function Home() {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4 w-full p-7">
            {apps.map((app, index) => (
                <Link key={index} href={app.url} className={cn("bg-secondary p-4 border rounded", app.disabled && "opacity-50 pointer-events-none")}>
                    <app.icon className="text-neutral-400 dark:text-neutral-600 n-icon" />
                    <span className="truncat my-5px text-lg text-black dark:text-white">{app.title}</span>
                    {app.description && <div className="line-clamp-2 text-neutral-500 dark:text-neutral-400">{app.description}</div>}
                </Link>
            ))}
        </div>
    );
}
