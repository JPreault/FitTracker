"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateCaloriesAcswWalking } from "@/lib/calculators/steps";
import { useUserStore } from "@/stores/user-store";
import { Calculator, ChevronDown, Flame, Footprints, Info, RotateCcw, Ruler } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function StepsPage() {
    const { height, weight, customStrideLength, updateUser } = useUserStore();

    // Calculator State (Distance -> Steps)
    const [distanceStr, setDistanceStr] = useState("");
    const [unit, setUnit] = useState<"km" | "m">("km");

    // Advanced Options State
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [inclineStr, setInclineStr] = useState("0");
    const [intensityMode, setIntensityMode] = useState<"duration" | "speed">("duration");
    const [durationStr, setDurationStr] = useState("");
    const [speedStr, setSpeedStr] = useState("");

    // Calculator State (Steps -> Distance)
    const [stepsInputStr, setStepsInputStr] = useState("");

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

    // 3. Calculate Steps (Distance -> Steps)
    let stepsResult: number | null = null;
    const distanceVal = parseFloat(distanceStr.replace(",", "."));
    const distanceMeters = !isNaN(distanceVal) && distanceVal > 0 ? (unit === "km" ? distanceVal * 1000 : distanceVal) : 0;

    if (distanceMeters > 0 && effectiveStride) {
        stepsResult = Math.round(distanceMeters / effectiveStride);
    }

    // 3b. Calculate Calories (ACSM Walking)
    // Inputs
    const inclinePct = parseFloat(inclineStr.replace(",", ".")) || 0;
    const durationMin = durationStr ? parseFloat(durationStr.replace(",", ".")) : undefined;
    const speedKmh = speedStr ? parseFloat(speedStr.replace(",", ".")) : undefined;

    // Calculation (only valid if we have weight and (duration or speed))
    const caloriesResult =
        weight && distanceMeters > 0
            ? calculateCaloriesAcswWalking({
                  distanceMeters,
                  weightKg: weight,
                  inclinePct,
                  durationMin: intensityMode === "duration" ? durationMin : undefined,
                  speedKmh: intensityMode === "speed" ? speedKmh : undefined,
              })
            : null;

    // 4. Calculate Distance (Steps -> Distance)
    let distanceResultMeters: number | null = null;
    const stepsInputVal = parseInt(stepsInputStr.replace(/\s/g, ""), 10);

    if (!isNaN(stepsInputVal) && stepsInputVal > 0 && effectiveStride) {
        distanceResultMeters = stepsInputVal * effectiveStride;
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

    const formatDistanceResult = (meters: number) => {
        if (meters >= 1000) {
            return (meters / 1000).toFixed(2) + " km";
        }
        return Math.round(meters) + " m";
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Calculateur de Pas</h1>
                <p className="text-muted-foreground">Estimez vos pas ou votre distance parcourue.</p>
            </div>

            {/* Main Calculator Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <Tabs defaultValue="dist-to-steps" className="w-full">
                    <div className="p-6 pb-0">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="dist-to-steps">Distance &rarr; Pas</TabsTrigger>
                            <TabsTrigger value="steps-to-dist">Pas &rarr; Distance</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6 space-y-6">
                        <TabsContent value="dist-to-steps" className="space-y-6 m-0">
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

                            {/* Advanced Options Accordion */}
                            <div className="rounded-lg border bg-muted/40 overflow-hidden">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/60 transition-colors"
                                >
                                    <span>Options avancées (Calories)</span>
                                    <ChevronDown className={`size-4 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
                                </button>
                                {showAdvanced && (
                                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2">
                                        <Separator className="mb-4" />

                                        {/* Incline */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="incline">Inclinaison (%)</Label>
                                                <span className="text-xs text-muted-foreground">Pente (ex: 0 = plat)</span>
                                            </div>
                                            <Input
                                                id="incline"
                                                type="number"
                                                min="0"
                                                max="30"
                                                value={inclineStr}
                                                onChange={(e) => setInclineStr(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Intensity Mode Toggle */}
                                        <div className="space-y-3">
                                            <Label>Intensité (pour calcul calories)</Label>
                                            <div className="flex rounded-md border bg-muted p-1">
                                                <button
                                                    onClick={() => setIntensityMode("duration")}
                                                    className={`flex-1 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                                                        intensityMode === "duration" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                                    }`}
                                                >
                                                    Durée (min)
                                                </button>
                                                <button
                                                    onClick={() => setIntensityMode("speed")}
                                                    className={`flex-1 px-3 py-1.5 rounded-sm text-sm font-medium transition-all ${
                                                        intensityMode === "speed" ? "bg-background shadow-sm" : "hover:bg-background/50"
                                                    }`}
                                                >
                                                    Vitesse (km/h)
                                                </button>
                                            </div>

                                            {intensityMode === "duration" ? (
                                                <Input
                                                    type="number"
                                                    placeholder="Durée en minutes (ex: 45)"
                                                    value={durationStr}
                                                    onChange={(e) => setDurationStr(e.target.value)}
                                                />
                                            ) : (
                                                <Input
                                                    type="number"
                                                    placeholder="Vitesse en km/h (ex: 5.0)"
                                                    value={speedStr}
                                                    onChange={(e) => setSpeedStr(e.target.value)}
                                                />
                                            )}
                                        </div>

                                        {/* Weight Warning */}
                                        {!weight && (
                                            <div className="rounded-md bg-yellow-500/15 p-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                                                <Info className="size-4 mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    Pour estimer les calories, votre poids est nécessaire.
                                                    <Link href="/profile" className="block font-semibold hover:underline mt-1">
                                                        Renseigner mon poids &rarr;
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Result Section (Steps) */}
                            <div className="rounded-lg bg-primary/5 p-6 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                                {!effectiveStride ? (
                                    <div className="text-center space-y-3 z-10">
                                        <p className="text-muted-foreground">Configuration requise</p>
                                        <Link href="/profile">
                                            <Button variant="outline">Renseigner ma taille</Button>
                                        </Link>
                                        <p className="text-xs text-muted-foreground mt-2">Nécessaire pour estimer votre foulée.</p>
                                    </div>
                                ) : stepsResult !== null ? (
                                    <div className="text-center z-10 animate-in zoom-in-95 duration-300">
                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Estimation</span>
                                        <div className="text-6xl font-black tracking-tighter text-primary mt-2">
                                            {stepsResult.toLocaleString("fr-FR")}
                                        </div>
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

                            {/* Result Section (Calories) */}
                            {caloriesResult && (
                                <div className="rounded-lg border bg-card p-4 space-y-3 animate-in slide-in-from-bottom-2 fade-in">
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                        <Flame className="size-5 text-orange-500 fill-orange-500" />
                                        Calories Brûlées
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold tracking-tight">{Math.round(caloriesResult.kcalTotal)}</span>
                                        <span className="text-muted-foreground font-medium">kcal</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t mt-2">
                                        <div>
                                            <span className="block opacity-70">Intensité</span>
                                            <span className="font-medium text-foreground">
                                                {caloriesResult.speedKmh.toFixed(1)} km/h
                                                {inclinePct > 0 ? ` (+${inclinePct}%)` : ""}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block opacity-70">Dépense estimée</span>
                                            <span className="font-medium text-foreground">{caloriesResult.kcalPerMin.toFixed(1)} kcal/min</span>
                                        </div>
                                        <div className="col-span-2 text-[10px] mt-1 opacity-50">Modèle: ACSM Walking Equation</div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="steps-to-dist" className="space-y-6 m-0">
                            {/* Input Section */}
                            <div className="space-y-4">
                                <Label htmlFor="steps">Nombre de pas</Label>
                                <Input
                                    id="steps"
                                    type="number"
                                    placeholder="0"
                                    value={stepsInputStr}
                                    onChange={(e) => setStepsInputStr(e.target.value)}
                                    className="text-lg"
                                />
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
                                ) : distanceResultMeters !== null ? (
                                    <div className="text-center z-10 animate-in zoom-in-95 duration-300">
                                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Estimation</span>
                                        <div className="text-6xl font-black tracking-tighter text-primary mt-2">
                                            {formatDistanceResult(distanceResultMeters)}
                                        </div>
                                        <div className="text-lg text-primary/80 font-medium">parcourus</div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground z-10">
                                        <Ruler className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>Entrez un nombre de pas pour commencer</p>
                                    </div>
                                )}
                                {/* Background Decor */}
                                <Ruler className="absolute -bottom-8 -right-8 w-48 h-48 text-primary/5 rotate-[-15deg] pointer-events-none" />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

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

                                <div className="grid gap-6 py-6 px-4">
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
                        <strong>Pas :</strong> Estimation basée sur votre taille ({height ? `${height} cm` : "?"}) avec la formule{" "}
                        <em>Taille × 0.413</em>.
                    </li>
                    <li>
                        <strong>Calories :</strong> Utilise l&apos;équation de marche de l&apos;ACSM qui prend en compte votre poids, la vitesse et
                        l&apos;inclinaison du terrain.
                    </li>
                </ul>
            </div>
        </div>
    );
}
