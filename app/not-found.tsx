import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-8 text-center animate-in fade-in zoom-in-50 duration-500">
            <div className="space-y-4">
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                        <FileQuestion className="h-32 w-32 text-primary relative z-10" />
                    </div>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl">404</h2>
                <h3 className="text-2xl font-semibold tracking-tight text-muted-foreground">Page introuvable</h3>
                <p className="text-muted-foreground max-w-[400px] mx-auto px-4">
                    La page que vous recherchez semble avoir disparu ou n&apos;a jamais existé.
                </p>
            </div>

            <Button asChild size="lg" className="gap-2">
                <Link href="/">
                    <Home className="h-4 w-4" />
                    Retour à l&apos;accueil
                </Link>
            </Button>
        </div>
    );
}
