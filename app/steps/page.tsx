"use strict";
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUserStore } from "@/stores/user-store";
import { Calculator, Footprints, RotateCcw, Ruler } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function StepsPage() {
    const { height, customStrideLength, updateUser } = useUserStore();

    // Calculator State
    const [distanceStr, setDistanceStr] = useState("");
    const [unit, setUnit] = useState<"km" | "m">("km");

    // Calibration State
    const [calibDistanceStr, setCalibDistanceStr] = useState("");
    const [calibStepsStr, setCalibStepsStr] = useState("");

    // --- LOGIC ---

    // 1. Calculate Estimated Stride (in meters)
    // Formula: Height (cm) * 0.413 / 100
    const estimatedStride = height ? (height * 0.413) / 100 : null;

    // 2. Determine Effective Stride
    const effectiveStride = customStrideLength || estimatedStride;
    const isCalibrated = !!customStrideLength;

    // 3. Calculate Steps
    let steps: number | null = null;
    const distanceVal = parseFloat(distanceStr.replace(",", "."));

    if (!isNaN(distanceVal) && distanceVal > 0 && effectiveStride) {
        const distanceInMeters = unit === "km" ? distanceVal * 1000 : distanceVal;
        steps = Math.round(distanceInMeters / effectiveStride);
    }

    // --- HANDLERS ---

    const handleCalibrate = () => {
        const dist = parseFloat(calibDistanceStr.replace(",", "."));
        const stps = parseFloat(calibStepsStr.replace(",", "."));

        if (!dist || !stps || dist <= 0 || stps <= 0) {
            toast.error("Veuillez entrer des valeurs valides.");
            return;
        }

        const newStride = dist / stps;
        updateUser({ customStrideLength: newStride });
        toast.success("Foulée calibrée avec succès !");

        // Reset inputs
        setCalibDistanceStr("");
        setCalibStepsStr("");
    };

    const handleResetCalibration = () => {
        updateUser({ customStrideLength: null });
        toast.info("Retour à la foulée estimée.");
    };

    // --- RENDER HELPERS ---

    const formatStride = (val: number) => (val * 100).toFixed(1) + " cm";

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Calculateur de Pas</h1>
                <p className="text-muted-foreground">Estimez votre nombre de pas en fonction de la distance parcourue.</p>
            </div>

            {/* Main Calculator Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="p-6 space-y-6">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <Label htmlFor="distance">Distance à parcourir</Label>
                        <div className="flex gap-2">
                            <Input
                                id="distance"
                                type="number"
                                placeholder="0"
                                value={distanceStr}
                                onChange={(e) => setDistanceStr(e.target.value)}
                                className="text-lg"
                            />
                            <div className="flex rounded-md border bg-muted p-1">
                                <button
                                    onClick={() => setUnit("km")}
                                    className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                                        unit === "km" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                    }`}
                                >
                                    km
                                </button>
                                <button
                                    onClick={() => setUnit("m")}
                                    className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                                        unit === "m" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                    }`}
                                >
                                    m
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Result Section */}
                    <div className="rounded-lg bg-primary/5 p-6 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                        {!effectiveStride ? (
                            <div className="text-center space-y-3 z-10">
                                <p className="text-muted-foreground">Configuration requise</p>
                                <Link href="/profile">
                                    <Button variant="outline">Renseigner ma taille</Button>
                                </Link>
                                <p className="text-xs text-muted-foreground mt-2">Nécessaire pour estimer votre foulée.</p>
                            </div>
                        ) : steps !== null ? (
                            <div className="text-center z-10 animate-in zoom-in-95 duration-300">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Estimation</span>
                                <div className="text-6xl font-black tracking-tighter text-primary mt-2">{steps.toLocaleString("fr-FR")}</div>
                                <div className="text-lg text-primary/80 font-medium">pas</div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground z-10">
                                <Footprints className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Entrez une distance pour commencer</p>
                            </div>
                        )}

                        {/* Background Decor */}
                        <Footprints className="absolute -bottom-8 -right-8 w-48 h-48 text-primary/5 rotate-[-15deg] pointer-events-none" />
                    </div>
                </div>

                {/* Footer / Stride Info */}
                <div className="p-6 pt-0">
                    <Separator className="mb-4" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Foulée utilisée :</span>
                                {effectiveStride ? (
                                    <span className="font-mono font-bold text-primary">{formatStride(effectiveStride)}</span>
                                ) : (
                                    <span className="text-sm text-destructive">Inconnue</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {isCalibrated ? (
                                    <div className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                        Calibrée (Précis)
                                    </div>
                                ) : height ? (
                                    <div className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                                        Estimée (Moyenne)
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="secondary" size="sm" className="gap-2">
                                    <Ruler className="size-4" />
                                    Calibrer ma foulée
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Calibration de la foulée</SheetTitle>
                                    <SheetDescription>Pour une précision maximale, marchez une distance connue et comptez vos pas.</SheetDescription>
                                </SheetHeader>

                                <div className="grid gap-6 py-6">
                                    <div className="space-y-2">
                                        <Label>Distance réelle parcourue (m)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 500"
                                            value={calibDistanceStr}
                                            onChange={(e) => setCalibDistanceStr(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nombre de pas comptés</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 650"
                                            value={calibStepsStr}
                                            onChange={(e) => setCalibStepsStr(e.target.value)}
                                        />
                                    </div>

                                    {calibDistanceStr && calibStepsStr && (
                                        <div className="rounded-md bg-muted p-3 text-sm text-center">
                                            Nouvelle foulée calculée :{" "}
                                            <strong>{formatStride(parseFloat(calibDistanceStr) / parseFloat(calibStepsStr) || 0)}</strong>
                                        </div>
                                    )}
                                </div>

                                <SheetFooter className="flex-col gap-2 sm:gap-0">
                                    <SheetClose asChild>
                                        <Button onClick={handleCalibrate} className="w-full">
                                            Enregistrer la calibration
                                        </Button>
                                    </SheetClose>
                                    {isCalibrated && (
                                        <SheetClose asChild>
                                            <Button variant="destructive" onClick={handleResetCalibration} className="w-full mt-2 sm:mt-0">
                                                <RotateCcw className="size-4 mr-2" />
                                                Réinitialiser (Utiliser l&apos;estimation)
                                            </Button>
                                        </SheetClose>
                                    )}
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>

            {/* Theory / Explanations */}
            <div className="space-y-4 text-sm text-muted-foreground">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Calculator className="size-4" />
                    Comment ça marche ?
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>
                        <strong>Estimation :</strong> Basée sur votre taille ({height ? `${height} cm` : "?"}) avec la formule <em>Taille × 0.413</em>
                        .
                    </li>
                    <li>
                        <strong>Calibration :</strong> Remplace l&apos;estimation par votre longueur de pas réelle. Recommandé pour la marche sportive
                        ou la randonnée.
                    </li>
                </ul>
            </div>
        </div>
    );
}
