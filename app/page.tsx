import { Flame, Footprints } from "lucide-react";
import Link from "next/link";

export default function Home() {
    return (
        <div className="grid grid-cols-2 gap-4 w-full flex-1 p-7">
            <Link href="/steps" className="bg-secondary p-4 flex flex-col justify-center items-center border">
                <Footprints className="size-10" />
                <span className="text-2xl font-bold">Steps</span>
            </Link>
            <Link href="/calories" className="bg-secondary p-4 flex flex-col justify-center items-center border">
                <Flame className="size-10" />
                <span className="text-2xl font-bold">Calories</span>
            </Link>
            <div className="bg-secondary p-4 flex flex-col justify-center items-center border"></div>
            <div className="bg-secondary p-4 flex flex-col justify-center items-center border"></div>
        </div>
    );
}
