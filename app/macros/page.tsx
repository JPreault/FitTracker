"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateBMR, calculateTDEE } from "@/lib/calculators/calories";
import { useUserStore } from "@/stores/user-store";
import { AlertTriangle, Droplet, Fish, Info, Utensils, Wheat } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function MacrosPage() {
    const { height, weight, age, gender, activityLevel } = useUserStore();

    // Global Inputs
    const [manualCalories, setManualCalories] = useState<string | null>(null);

    // Initial logic: derive TDEE from store
    const bmr = calculateBMR(weight!, height!, age!, gender!);
    const tdee = bmr && activityLevel ? calculateTDEE(bmr, activityLevel!) : null;
    const targetCaloriesStr = manualCalories ?? (tdee?.toString() || "2000");

    // Mode: Ratio (%)
    const [proteinPct, setProteinPct] = useState<number>(30);
    const [fatPct, setFatPct] = useState<number>(35);
    const [carbPct, setCarbPct] = useState<number>(35);

    // Mode: Protein g/kg
    const [proteinGPerKgStr, setProteinGPerKgStr] = useState<string>("1.8");
    const [fatPctForGKg, setFatPctForGKg] = useState<number>(30);

    // --- LOGIC ---
    const targetCalories = parseInt(targetCaloriesStr) || 0;

    // Computed Values
    let proteinG = 0,
        fatG = 0,
        carbG = 0;
    let proteinKcal = 0,
        fatKcal = 0,
        carbKcal = 0;
    let error: string | null = null;
    const warnings: string[] = [];

    // Validations & Calculations depending on active tab
    // We can compute both but only display relevant based on UI structure,
    // or we can wrap calculation in functions.

    const calculateByRatio = () => {
        const totalPct = proteinPct + fatPct + carbPct;
        if (totalPct !== 100) {
            error = `Le total des pourcentages doit être de 100% (actuel : ${totalPct}%)`;
            return;
        }

        proteinKcal = (targetCalories * proteinPct) / 100;
        fatKcal = (targetCalories * fatPct) / 100;
        carbKcal = (targetCalories * carbPct) / 100;

        proteinG = Math.round(proteinKcal / 4);
        fatG = Math.round(fatKcal / 9);
        carbG = Math.round(carbKcal / 4);

        // Warnings
        if (fatPct < 15) warnings.push("Lipides < 15% : Attention, cela peut être trop bas pour la santé hormonale.");
        if (proteinPct > 40) warnings.push("Protéines > 40% : C'est très élevé, assurez-vous d'avoir des reins en bonne santé.");
    };

    const calculateByProtPerKg = () => {
        if (!weight) {
            error = "Poids requis pour ce mode.";
            return;
        }
        const proteinGPerKg = parseFloat(proteinGPerKgStr);
        if (!proteinGPerKg || proteinGPerKg <= 0) {
            error = "Veuillez entrer une valeur valide pour les protéines (g/kg).";
            return;
        }

        proteinG = Math.round(weight * proteinGPerKg);
        proteinKcal = proteinG * 4;

        fatKcal = (targetCalories * fatPctForGKg) / 100;
        fatG = Math.round(fatKcal / 9);

        carbKcal = targetCalories - proteinKcal - fatKcal;
        carbG = Math.round(carbKcal / 4);

        if (carbKcal < 0) {
            error = "Impossible : Les calories pour protéines et lipides dépassent votre objectif total.";
        }

        // Warnings
        if (proteinGPerKg < 0.8) warnings.push("Protéines < 0.8g/kg : Risque de carence (recommandation OMS).");
        if (proteinGPerKg > 2.5) warnings.push("Protéines > 2.5g/kg : Généralement inutile même pour les athlètes.");
    };

    // We decide which calculation to run based on the rendered tab,
    // but in React state, we might just have a "mode" state or handle it in render.
    // For simplicity, I'll use a state for the active tab to know which calculation to show.
    const [activeTab, setActiveTab] = useState("ratio");

    if (activeTab === "ratio") {
        calculateByRatio();
    } else {
        calculateByProtPerKg();
    }

    // Global Sanity Check
    if (targetCalories < 1000) warnings.push("Objectif calorique < 1000 kcal : Très bas, soyez prudent.");

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Calculateur de Macros</h1>
                <p className="text-muted-foreground">Calculez vos besoins en Protéines, Lipides et Glucides selon votre objectif.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* CONFIGURATION PANEL */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Objectif</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="calories">Cible Calorique (kcal/j)</Label>
                                <Input id="calories" type="number" value={targetCaloriesStr} onChange={(e) => setManualCalories(e.target.value)} />
                                <p className="text-xs text-muted-foreground">
                                    Utilisez le{" "}
                                    <Link href="/calories" className="underline hover:text-primary">
                                        calculateur de calories
                                    </Link>{" "}
                                    pour estimer ce chiffre.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Répartition</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs defaultValue="ratio" value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="w-full rounded-none border-b bg-transparent p-0">
                                    <TabsTrigger
                                        value="ratio"
                                        className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                                    >
                                        Ratio %
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="g_kg"
                                        className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                                    >
                                        Protéines g/kg
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="ratio" className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-blue-500">Protéines ({proteinPct}%)</Label>
                                            </div>
                                            <Slider
                                                value={[proteinPct]}
                                                onValueChange={(vals) => setProteinPct(vals[0])}
                                                max={100}
                                                step={5}
                                                className="[&>.relative>.absolute]:bg-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-yellow-500">Lipides ({fatPct}%)</Label>
                                            </div>
                                            <Slider
                                                value={[fatPct]}
                                                onValueChange={(vals) => setFatPct(vals[0])}
                                                max={100}
                                                step={5}
                                                className="[&>.relative>.absolute]:bg-yellow-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label className="text-green-500">Glucides ({carbPct}%)</Label>
                                            </div>
                                            <Slider
                                                value={[carbPct]}
                                                onValueChange={(vals) => setCarbPct(vals[0])}
                                                max={100}
                                                step={5}
                                                className="[&>.relative>.absolute]:bg-green-500"
                                            />
                                        </div>

                                        <div
                                            className={`p-2 rounded text-sm font-medium text-center ${
                                                proteinPct + fatPct + carbPct === 100
                                                    ? "bg-muted text-muted-foreground"
                                                    : "bg-destructive/10 text-destructive"
                                            }`}
                                        >
                                            Total : {proteinPct + fatPct + carbPct}%
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="g_kg" className="p-6 space-y-6">
                                    {!weight ? (
                                        <div className="text-center space-y-4">
                                            <AlertTriangle className="size-10 text-muted-foreground mx-auto opacity-50" />
                                            <p className="text-sm text-muted-foreground">
                                                Vous devez renseigner votre poids dans votre profil pour utiliser ce mode.
                                            </p>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href="/profile">Renseigner mon profil</Link>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Protéines (g / kg de poids corps)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={proteinGPerKgStr}
                                                    onChange={(e) => setProteinGPerKgStr(e.target.value)}
                                                />
                                                <p className="text-xs text-muted-foreground">Recommandé : 1.2 à 2.0 pour les actifs.</p>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <Label className="text-yellow-500">Part de Lipides ({fatPctForGKg}%)</Label>
                                                </div>
                                                <Slider
                                                    value={[fatPctForGKg]}
                                                    onValueChange={(vals) => setFatPctForGKg(vals[0])}
                                                    max={60}
                                                    min={10}
                                                    step={5}
                                                    className="[&>.relative>.absolute]:bg-yellow-500"
                                                />
                                            </div>

                                            <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground text-center">
                                                Les glucides combleront le reste des calories.
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* RESULTS PANEL */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Error State */}
                    {error ? (
                        <Card className="border-destructive/50 bg-destructive/5 h-full flex flex-col items-center justify-center p-8 text-center">
                            <AlertTriangle className="size-12 text-destructive mb-4" />
                            <h3 className="text-lg font-bold text-destructive">Calcul Impossible</h3>
                            <p className="text-muted-foreground mt-2">{error}</p>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid sm:grid-cols-3 gap-4">
                                {/* PROTEINS */}
                                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Fish className="size-4" /> Protéines
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-black tracking-tighter text-foreground">
                                            {proteinG}
                                            <span className="text-base font-normal text-muted-foreground ml-1">g</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {Math.round(proteinKcal)} kcal ({Math.round((proteinKcal / targetCalories) * 100)}%)
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* FATS */}
                                <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-yellow-600 dark:text-yellow-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Droplet className="size-4" /> Lipides
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-black tracking-tighter text-foreground">
                                            {fatG}
                                            <span className="text-base font-normal text-muted-foreground ml-1">g</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {Math.round(fatKcal)} kcal ({Math.round((fatKcal / targetCalories) * 100)}%)
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CARBS */}
                                <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-green-600 dark:text-green-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Wheat className="size-4" /> Glucides
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-black tracking-tighter text-foreground">
                                            {carbG}
                                            <span className="text-base font-normal text-muted-foreground ml-1">g</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {Math.round(carbKcal)} kcal ({Math.round((carbKcal / targetCalories) * 100)}%)
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Warnings */}
                            {warnings.length > 0 && (
                                <Alert
                                    variant="default"
                                    className="border-orange-200 bg-orange-50 dark:bg-orange-950/10 dark:border-orange-900 text-orange-800 dark:text-orange-300"
                                >
                                    <Info className="h-4 w-4 stroke-orange-500" />
                                    <AlertTitle>Notes</AlertTitle>
                                    <AlertDescription className="mt-2">
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                            {warnings.map((w, i) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Summary / Tip */}
                            <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <Utensils className="size-4" /> Règles énergétiques
                                </h3>
                                <ul className="space-y-1 list-disc pl-5">
                                    <li>
                                        <strong>1g de Protéines</strong> = 4 kcal
                                    </li>
                                    <li>
                                        <strong>1g de Glucides</strong> = 4 kcal
                                    </li>
                                    <li>
                                        <strong>1g de Lipides</strong> = 9 kcal
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
